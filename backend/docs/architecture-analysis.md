# Backend Architecture Analysis Report

> Deep analysis of the Ability Engine, WebSocket/Event infrastructure, DDD compliance, SOLID adherence, and scalability posture.

---

## 1. Ability Engine (Resolution System)

### What works well

The resolution pipeline is the strongest part of the architecture. It follows a clean **Strategy + Factory** pattern:

```
AbilityActionFactory     ActionResolverFactory
       │                         │
  validates & creates        registers handlers
  Action value objects       into ActionResolver
       │                         │
       └────── Match ────────────┘
                │
         resolveActions(resolver)
                │
         ┌──────┴──────┐
         │ ActionResolver │
         │  ┌─────────┐  │
         │  │ Stage 0: TARGET_MUTATION │
         │  │ Stage 1: DEFENSIVE       │ ← ProtectHandler, VoteShieldHandler
         │  │ Stage 2: CANCELLATION    │ ← RoleBlockHandler
         │  │ Stage 3: OFFENSIVE       │ ← KillHandler
         │  │ Stage 4: READ            │ ← InvestigateHandler
         │  └─────────┘  │
         └───────────────┘
                │
         ResolutionContext (accumulates modifiers, state changes, results)
```

**Specific strengths:**

- `EffectHandler` interface is minimal and focused. Adding a new ability = one new class + one `registerHandler()` call. True OCP.
- `ResolutionContext` acts as a shared blackboard: handlers don't know about each other. `ProtectHandler` writes a `"protected"` modifier; `KillHandler` reads it. Zero coupling between handlers.
- Stage-based ordering with priority-based sorting within stages is the correct model for a Mafia/Werewolf-style resolution.
- `AbilityActionFactory` concentrates all validation (player exists, has template, has ability, targets valid) in one place before creating the `Action` value object.

### Issues found

#### Issue 1: EffectHandler.stage is dead code

Every `EffectHandler` declares a `readonly stage` field, but `ActionResolver.resolve()` never reads it. It reads `action.stage` instead:

```ts
// ActionResolver.ts:22-23
const staged = this.groupByStage(actions);  // uses action.stage
// ...
for (const action of stageActions) {  // iterates by action.stage
```

The handler's own `stage` property exists but is never consulted. This is misleading because it suggests handlers declare their stage, but in reality `DEFAULT_STAGE_BY_EFFECT` on the `Action` determines it. Either remove `stage` from `EffectHandler` or use it as the source of truth (not both).

**Severity**: Medium - causes confusion, not a bug.

#### Issue 2: Mixed injection strategy on Match

`Match` instantiates four domain services as private fields:

```ts
// match.ts:72-75
private readonly templateAssignment = new TemplateAssignmentService();
private readonly abilityActionFactory = new AbilityActionFactory();
private readonly winConditionEvaluator = new WinConditionEvaluator();
private readonly snapshotMapper = new MatchSnapshotMapper();
```

But `ActionResolver` is injected as a method parameter:

```ts
// match.ts:168
public resolveActions(resolver: ActionResolver): ResolutionResult {
```

This inconsistency means you cannot substitute `WinConditionEvaluator` or `AbilityActionFactory` in tests without replacing the `Match` class itself. The `ActionResolver` is testable because it's injected; the others are not.

**Severity**: High - violates DIP and makes isolated testing harder.

#### Issue 4: Domain imports shared via fragile relative paths

```ts
// ability.ts:8
import { ABILITY_DEFINITIONS } from "../../../../shared/src/ability-definitions";
// ResolutionContext.ts:1
import type {
  EffectResultType,
  Modifier,
} from "../../../../../shared/src/resolution-types";
```

The domain layer reaches 4-5 directories up to a `shared/` folder. This couples the domain to a monorepo file layout, and means the `shared` package is the actual owner of core domain concepts (`EffectResultType`, `Modifier`, `AbilityDefinition`). If `shared/` moves or gets published as a package, all these break.

**Severity**: Medium - fragile but functional. Consider either: (a) making `shared` a proper workspace package, or (b) owning these types in the domain and exporting them to shared.

---

## 2. WebSocket & Domain Events Structure

### What works well

```
Match aggregate                  Application layer              Infrastructure
┌─────────────┐     pullEvents()    ┌─────────────────────┐        ┌────────────────┐
│  emit()     │ ──────────────────► │ publishMatchEvents() │ ──────►│ RealtimePublisher │ (port)
│  _domainEvents[] │                │ (pure function)      │        └───────┬────────┘
└─────────────┘                     └─────────────────────┘                │ implements
                                                                   ┌──────┴───────┐
                                                              │ WebSocketPublisher │
                                                              │    (adapter)       │
                                                              └──────┬───────┘
                                                                     │ delegates to
                                                              ┌──────┴───────┐
                                                              │ MatchBroadcaster │ (interface)
                                                              └──────┬───────┘
                                                                     │ implements
                                                              ┌──────┴───────┐
                                                              │ WebSocketManager │
                                                              │  MatchRoom[]     │
                                                              └──────────────┘
```

- **Domain events are a discriminated union** (`MatchDomainEvent`). Exhaustive `switch` checking in `publishMatchEvents` ensures no event is silently dropped.
- **`pullEvents()` pattern** is textbook DDD: the aggregate collects events, the use case pulls and dispatches them after persistence. Events are cleared on pull, preventing double-dispatch.
- **`MatchBroadcaster` interface** decouples the domain-aware publisher from the raw WS transport. `WebSocketPublisher` speaks domain language; `WebSocketManager` speaks sockets.
- **Architecture fitness tests** (`architecture-fitness.spec.ts`) enforce that domain never imports infrastructure, and WS infrastructure never imports application. This is excellent for guarding the dependency rule over time.

### Issues found

#### Issue 1: RealtimePublisher violates ISP (Interface Segregation Principle)

```ts
export interface RealtimePublisher {
  matchStarted(matchId: string, payload: MatchStartedPayload): void;
  matchUpdated(matchId: string, match: MatchResponse): void;
  phaseChanged(matchId: string, phase: PhaseType): void;
  playerJoined(matchId: string, player: PlayerResponse): void;
  playerLeft(matchId: string, playerId: string): void;
  actionSubmitted(...): void;
  matchEnded(matchId: string, winner: MatchWinner): void;
  voteSubmitted(...): void;
  effectResolved(matchId: string, effect: EffectResult): void;
  gameMasterMessage(matchId: string, payload: GameMasterMessagePayload): void;
}
```

10 methods. Every new event type requires changes in 3 places:

1. Add the domain event to `MatchDomainEvent`
2. Add a method to `RealtimePublisher`
3. Add the case to `publishMatchEvents`
4. Implement in `WebSocketPublisher`

This is a **shotgun surgery** code smell. Consider replacing with a single method:

```ts
export interface RealtimePublisher {
  publish(matchId: string, event: MatchDomainEvent): void;
}
```

Then each adapter decides how to translate domain events to its transport. This also eliminates `publishMatchEvents()` entirely - the adapter itself becomes the mapper.

**Severity**: High - new events require coordinated changes across 4 files.

#### Issue 2: `WebSocketPublisher.effectResolved()` contains domain logic

```ts
effectResolved(matchId: string, effect: EffectResult): void {
  switch (effect.type) {
    case "kill":
      this.broadcaster.broadcastToMatch(matchId, { type: "player_killed", ... });
      break;
    case "investigate": {
      // decides to send only to actor, checks alignment exists
      this.broadcaster.sendToPlayer(matchId, effect.actorId, { ... });
      break;
    }
    // kill_blocked, protect, roleblock: silently ignored
  }
}
```

The infrastructure adapter is making business decisions: "investigate results are private to the actor", "protect results don't need notification". This domain knowledge should live in the domain or application layer. If someone later wants to notify a protected player, they'd have to change infrastructure code.

**Severity**: High - domain logic in the wrong layer.

#### Issue 3: Dual transport model is implicit

Players join/leave matches via **WebSocket** (`join_match`, `leave_match` client events), but use abilities and vote via **HTTP REST** (`POST /match/:id/ability`, `POST /match/:id/vote`). This split isn't documented and creates asymmetry:

- WS join does authorization via `JoinAuthorizer` but HTTP ability/vote has no auth at all
- WS disconnect triggers `LeaveMatchUseCase` automatically, but there's no equivalent for "what if the HTTP client disappears"
- The WS `ClientEvent` union defines `use_ability` and `submit_vote` types that are **never handled** (the switch default sends an error)

This means the `ClientEvent` type definition is misleading - it declares capabilities the server doesn't support.

**Severity**: Medium - works but confusing. Either remove unused event types from `ClientEvent` or implement them.

#### Issue 4: No reconnection support

When a player disconnects, `handleDisconnect` removes them from the room immediately. If they reconnect, they get a fresh `client_id` and must re-join. There's no session persistence. For a game that requires all players to be connected, this is a reliability risk.

**Severity**: Medium for development, High for production.

#### Issue 5: `publishMatchEvents` pulls events AFTER `toJSON()`

In `AdvancePhase.ts`:

```ts
const result = match.toJSON(); // line 37
const events = match.pullEvents(); // line 38
publishMatchEvents(events, result, this.publisher);
```

But in `SubmitVote.ts`:

```ts
const result = match.toJSON();
publishMatchEvents(match.pullEvents(), result, this.publisher);
```

And in `UseAbility.ts`:

```ts
return match.toJSON(); // no events published at all!
```

`UseAbilityUseCase` never publishes events. If `useAbility()` emitted domain events in the future, they'd be silently lost. Inconsistent patterns across use cases.

**Severity**: Medium - `UseAbility` doesn't emit events today, but the pattern is inconsistent and will bite when it does.

---

## 3. Match Aggregate - DDD Analysis

### What works well

- `Match` is a clear Aggregate Root that protects invariants (can't join after start, can't vote outside voting phase, etc.)
- `Phase` is a proper state machine with guard methods (`assertCanVote`, `assertCanUseAbility`, `assertCanResolve`)
- `DomainError` hierarchy with error codes is clean for API error responses
- Domain services are correctly separated: `MatchVoting`, `WinConditionEvaluator`, `TemplateAssignmentService`

### The Match is a God Aggregate

`Match` currently orchestrates:

| Responsibility    | Methods                                                 |
| ----------------- | ------------------------------------------------------- |
| Player lifecycle  | `addPlayer`, `removePlayer`                             |
| Game lifecycle    | `startWithTemplates`, `rematch`, `finishIfWinnerExists` |
| Phase management  | `advancePhase`, `getPhase`                              |
| Voting            | `submitVote` (delegates to MatchVoting)                 |
| Ability usage     | `useAbility`, `addAction`, `getActions`                 |
| Action resolution | `resolveActions`                                        |
| Serialization     | `toJSON`                                                |
| Event collection  | `emit`, `pullEvents`                                    |

That's 8 distinct responsibilities in ~250 lines. While it's not unmanageable now, each new feature (chat, timers, spectators, round tracking) will grow this class further.

**Consider**: Extracting `MatchVoting` is already done. But voting resolution logic (`advancePhase` lines 171-189 handling vote shields and elimination) still lives in `Match`. The aggregate is delegating storage to `MatchVoting` but keeping the resolution logic. Half-extracted.

### `TemplateAssignmentService.assign()` accepts `status: string`

```ts
public assign(status: string, players: Player[], templates: Template[]): Template[] {
  if (status !== "lobby") {
    throw new MatchAlreadyStarted();
  }
```

This should accept `MatchStatus` enum, not a raw string. Currently it works because `Match` passes `this.status` which is typed, but the service contract allows any string.

### Player is an Entity without identity equality

`Player` has an `id` but no `equals()` method. Comparisons throughout the codebase use `player.id === someId` (string comparison). This is error-prone if `Player` equality is ever needed in a Set or Map context, and doesn't follow the DDD Entity pattern where identity defines equality.

---

## 4. SOLID Compliance

| Principle                     | Grade | Analysis                                                                                                                                                                                             |
| ----------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** - Single Responsibility | C     | `Match` does too much. `WebSocketPublisher.effectResolved` makes domain decisions. `publishMatchNarration` handles both AI orchestration and fallback message generation.                            |
| **O** - Open/Closed           | A-    | `EffectHandler` pattern is excellent. New abilities need one new handler + one registration line. Loses points because `RealtimePublisher` and `publishMatchEvents` must change for every new event. |
| **L** - Liskov Substitution   | A     | All `EffectHandler` implementations are properly substitutable. `AiNarrator` implementations (Gemini, OpenRouter, Noop, Failover) work through the same interface.                                   |
| **I** - Interface Segregation | C     | `RealtimePublisher` has 10 methods. `MatchBroadcaster` has 3 methods of differing granularity.                                                                                                       |
| **D** - Dependency Inversion  | B     | Ports exist for repositories and publishers. But `Match` instantiates concrete domain services internally. Container wiring is clean at the application level.                                       |

---

## 5. Scalability Assessment

### Current state: Single-process, in-memory

| Concern          | Current                                | Production-ready?                          |
| ---------------- | -------------------------------------- | ------------------------------------------ |
| Persistence      | `InMemoryMatchRepository` (Map)        | No - server restart = data loss            |
| WS state         | `WebSocketManager` rooms in memory     | No - can't scale past 1 node               |
| Concurrency      | None. No locking/versioning on Match   | No - race conditions possible              |
| Event processing | Synchronous pull + dispatch in request | No - blocks response on all event handlers |
| AI narration     | Fire-and-forget (`void ... .catch()`)  | Acceptable - graceful degradation          |

### What you need for horizontal scaling

1. **Persistent storage** with optimistic locking (version field on Match). Two simultaneous `advancePhase` requests can currently corrupt game state.

2. **Pub/Sub for WS** (Redis, NATS). Currently if Player A connects to Server 1 and Player B to Server 2, they can't see each other's events.

3. **Event bus** for domain events. Currently `pullEvents()` is synchronous and in-process. For Event Sourcing or async side effects (analytics, replays), you'd need to persist and replay events.

### What's already well-positioned

- The `RealtimePublisher` port means you can swap WS transport without touching domain/application code
- `MatchRepository` port means storage can be swapped to Postgres/Redis
- Domain events are already a first-class concept - adding event persistence is additive, not a rewrite
- The DI container supports singleton vs transient, so infra swap is configuration-level

---

## 6. Specific Recommendations

### Priority 1 (Design Defects)

| #   | Issue                                                 | Fix                                                                                               |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | `Match` instantiates domain services internally       | Inject them via constructor (add to `MatchProps` or create a `MatchServices` bag)                 |
| 2   | `addAction()` is an unguarded public method           | Make it private or remove it. All action creation should go through `useAbility()`                |
| 3   | `RealtimePublisher` has 10 methods (ISP)              | Collapse to `publish(matchId, event: MatchDomainEvent)`. Let the adapter decide transport mapping |
| 4   | Domain logic in `WebSocketPublisher.effectResolved()` | Move visibility rules (who sees what effect) into the domain or application layer                 |

### Priority 2 (Consistency)

| #   | Issue                                                                                | Fix                                                                                                      |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 5   | `UseAbilityUseCase` never publishes domain events                                    | Add `publishMatchEvents()` call for consistency with other use cases                                     |
| 6   | `EffectHandler.stage` field is unused                                                | Remove it from the interface, or use it as source of truth in `ActionResolver` instead of `Action.stage` |
| 7   | `TemplateAssignmentService.assign()` takes `string` for status                       | Change parameter to `MatchStatus`                                                                        |
| 8   | `ClientEvent` declares `use_ability` and `submit_vote` but server never handles them | Remove from the union or implement WS handlers                                                           |

### Priority 3 (Scalability Prep)

| #   | Issue                                     | Fix                                                                  |
| --- | ----------------------------------------- | -------------------------------------------------------------------- |
| 9   | No concurrency control on Match aggregate | Add a `version` field, implement optimistic locking in repository    |
| 10  | In-memory WS rooms                        | Extract room state behind an interface for future Redis/pub-sub swap |
| 11  | `shared/` imported via relative paths     | Set up as a proper workspace package (`@game/shared`)                |

---

## 7. Architecture Diagram (Current State)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Infrastructure                           │
│                                                                 │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
│  │ Express  │  │ WebSocket     │  │ AI Narrators             │ │
│  │ Routes   │  │ Manager       │  │ (Gemini/OpenRouter/Noop) │ │
│  │          │  │ MatchRoom[]   │  │ FailoverAiNarrator       │ │
│  └────┬─────┘  └───────┬───────┘  └────────────┬─────────────┘ │
│       │                │                        │               │
│       │         ┌──────┴──────┐                 │               │
│       │         │ WebSocket   │                 │               │
│       │         │ Publisher   │ ◄─ domain logic leak (effectResolved)
│       │         └──────┬──────┘                 │               │
└───────┼────────────────┼────────────────────────┼───────────────┘
        │                │                        │
        │        implements                  implements
        │                │                        │
┌───────┼────────────────┼────────────────────────┼───────────────┐
│       │          Application                    │               │
│       │                                         │               │
│  ┌────▼──────────────────┐  ┌───────────────────▼─────────┐    │
│  │ Use Cases             │  │ publishMatchNarration()     │    │
│  │ CreateMatch           │  │ publishMatchEvents()        │    │
│  │ JoinMatch             │  │ NarrationContextBuilder     │    │
│  │ StartMatch ──────────►│  │ PublicNarrationEventMapper  │    │
│  │ UseAbility (no events)│  └─────────────────────────────┘    │
│  │ AdvancePhase ────────►│                                      │
│  │ SubmitVote ──────────►│  Ports (interfaces):                 │
│  │ LeaveMatch            │  ├ RealtimePublisher (10 methods!)   │
│  │ RematchMatch          │  ├ MatchRepository                   │
│  └───────────────────────┘  ├ TemplateRepository                │
│                             └ AiNarrator                        │
└─────────────────────────────────────────────────────────────────┘
        │
        │ delegates to
        │
┌───────▼─────────────────────────────────────────────────────────┐
│                          Domain                                  │
│                                                                  │
│  Entity:    Match (god aggregate) ◄── instantiates services      │
│             Player, Phase, Action, Ability, Template              │
│                                                                  │
│  Services:  ┌─────────────────┐  ┌────────────────────────────┐ │
│  (match/)   │ MatchVoting     │  │ resolution/                │ │
│             │ AbilityAction   │  │  ActionResolver            │ │
│             │  Factory        │  │  ActionResolverFactory     │ │
│             │ TemplateAssign  │  │  ResolutionContext         │ │
│             │  mentService    │  │  EffectHandler (interface) │ │
│             │ WinCondition    │  │  ├ KillHandler             │ │
│             │  Evaluator      │  │  ├ ProtectHandler          │ │
│             │ MatchSnapshot   │  │  ├ InvestigateHandler      │ │
│             │  Mapper         │  │  ├ RoleBlockHandler        │ │
│             └─────────────────┘  │  └ VoteShieldHandler       │ │
│                                  └────────────────────────────┘ │
│  Events:    MatchDomainEvent (discriminated union)               │
│  Errors:    DomainError hierarchy                                │
│                                                                  │
│  ⚠ depends on: shared/src/ via ../../../../ relative imports     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Verdict

The codebase demonstrates **genuine DDD understanding** - domain events, aggregate root, ports & adapters, domain services, ubiquitous language. The resolution engine is particularly well-designed with its Strategy/Factory/Blackboard pattern.

The main architectural risks are:

- **Match is accumulating too many responsibilities** and will become a maintenance bottleneck
- **RealtimePublisher's method-per-event design** will create shotgun surgery as events multiply
- **Domain logic in infrastructure** (`WebSocketPublisher.effectResolved`) will cause bugs when new effects are added and someone forgets to update the adapter
- **No concurrency control** means production deployments with multiple users can corrupt game state

None of these are blocking for continued development, but items 1-4 in Priority 1 should be addressed before adding more abilities or event types to avoid compounding the design debt.
