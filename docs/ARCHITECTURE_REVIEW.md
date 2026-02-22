# Architecture Review

An analysis of the current codebase through the lens of SOLID principles, DDD, and design patterns. The goal: identify what must be preserved, what will break as the engine scales to many abilities, roles, win conditions, and game modes, and how to fix it.

---

## 1. What the Architecture Gets Right

These patterns are load-bearing. Any refactoring must preserve them.

### 1.1 Effect System (Strategy + Registry + Factory)

The `IAbilityEffect` interface, `EffectRegistry`, and `AbilityEffectFactory` form the core extensibility point. Adding a new ability is:

1. Implement `IAbilityEffect` (~15 lines)
2. Register it in the factory (1 line)

No switch statements, no modification to `Match`, `Player`, or `Action`. This is the textbook Open/Closed Principle applied correctly.

The `allActions` parameter in `execute()` is especially well-designed. Social deduction games require inter-action communication (roleblock cancels actions, bus driver swaps targets, tracker sees who visited whom). Passing the full action list makes all of this possible without coupling effects to each other.

**Priority-based ordering** is the right model for resolution. It naturally expresses the domain: protection must resolve before killing, roleblocking must resolve before everything.

### 1.2 Clean Layer Separation

```
HTTP (Express + Zod) → Application (Use Cases) → Domain (Match, Effects) → Infrastructure (Repos)
```

Dependencies point inward. Use cases don't know about HTTP. The domain doesn't know about persistence. Effects don't know about `Match` (they interact through `ResolutionContext`). This is Clean Architecture applied correctly.

### 1.3 ResolutionContext as an Anti-Corruption Layer

Effects don't call `Match` methods directly. Instead, `Match.resolveActions()` builds a `ResolutionContext` object with callbacks:

```typescript
// match.ts:280-290
const context: ResolutionContext = {
  killPlayer: (id: string) => this.eliminatePlayer(id),
  isPlayerAlive: (id: string) => {
    const player = this.getPlayerByID(id);
    return player.isAlive();
  },
  getPlayerAlignment: (id: string) => {
    const player = this.getPlayerByID(id);
    return player.getTemplate()?.alignment ?? "unknown";
  },
};
```

This prevents circular coupling and means effects are unit-testable with a mock context. Preserve this.

### 1.4 Repository Pattern with Interface Segregation

`MatchRepository` and `TemplateRepository` are interfaces with in-memory implementations. The async contract means swapping to a database requires zero changes to use cases or domain code.

### 1.5 Domain Error Hierarchy

All errors extend `DomainError` with a machine-readable `code`. The HTTP layer maps these to status codes in one place (`middleware.ts`). This is clean and consistent.

### 1.6 Constructor-Based Dependency Injection

All use cases receive their dependencies through constructors, wired up in `createApp()`. No service locator, no global state. Testable and explicit.

---

## 2. Critical Issues (Ranked by Scalability Impact)

### 2.1 Match is a God Object

**Violated principle:** Single Responsibility Principle

**Current state:** `Match` (312 lines) handles seven distinct responsibilities:

| Responsibility | Methods | Lines |
|---|---|---|
| Player management | `addPlayer`, `getPlayers`, `getPlayerByID`, `eliminatePlayer` | 139-163 |
| Phase management | `advancePhase`, `nextPhase`, `getCurrentPhase`, `ensurePhase` | 120-137, 165-182 |
| Action orchestration | `submitAction`, `resolveActions` | 86-97, 272-311 |
| Vote orchestration | `submitVote`, `tallyVotes` | 99-220 |
| Win condition evaluation | `checkWinCondition`, `getWinner` | 47-67, 239-266 |
| Jester win condition | `checkJesterWin`, `getJesterWinners` | 222-237 |
| Investigation result storage | `getInvestigationResult` | 268-270 |

This is manageable at 4 abilities. At 20 abilities and 5 win conditions, `Match` will be 800+ lines with interleaved concerns.

**Why it matters:** Every new feature (delayed effects, ability usage limits, custom phase orders, new win conditions) requires modifying `Match`. This is the opposite of Open/Closed.

**Proposed extraction:**

```
Match (orchestrator only)
  ├── PlayerRoster        → player management
  ├── PhaseManager        → phase state machine + transition hooks
  ├── ActionResolver      → resolution pipeline (currently resolveActions)
  ├── VoteTallier         → vote counting logic
  └── WinConditionEvaluator → pluggable win condition checks
```

Each extracted component would be a focused collaborator injected into `Match`. Match retains its role as the aggregate root - it delegates, but it's still the single entry point for all game mutations.

---

### 2.2 Win Conditions are Hardcoded

**Violated principle:** Open/Closed Principle

`checkWinCondition()` at `match.ts:239-266` hardcodes the hero-vs-villain counting logic:

```typescript
private checkWinCondition(): void {
  const alivePlayers = this.players.filter(p => p.isAlive());
  if (alivePlayers.length === 0) { this.status = MatchStatus.FINISHED; return; }

  const aliveVillains = alivePlayers.filter(p =>
    p.getTemplate()?.alignment === "villain").length;
  const aliveHeroes = alivePlayers.filter(p =>
    p.getTemplate()?.alignment === "hero").length;

  if (aliveVillains > 0 && aliveVillains >= aliveHeroes) {
    this.status = MatchStatus.FINISHED; return;
  }
  if (aliveVillains === 0) {
    this.status = MatchStatus.FINISHED; return;
  }
}
```

The jester win condition is bolted on separately in `checkJesterWin()`, called from a different place in `advancePhase()`. Adding a new win condition (Serial Killer wins when last alive, Cult wins when all are converted, Survivor wins if alive at game end) requires modifying both `checkWinCondition()`, `getWinner()`, and `advancePhase()`.

**Proposed fix:** Strategy pattern, mirroring the effect system.

```typescript
// domain/winConditions/IWinCondition.ts
interface IWinCondition {
  readonly id: string;
  evaluate(players: ReadonlyArray<PlayerSnapshot>): WinResult | null;
}

type WinResult = {
  winnerId: string;       // which condition triggered
  winnerLabel: string;    // "heroes", "villains", "jester", etc.
  playerIds: string[];    // which players won
  endsGame: boolean;      // does this end the match?
};

// domain/winConditions/MajorityWinCondition.ts
class MajorityWinCondition implements IWinCondition {
  readonly id = "majority";
  evaluate(players) {
    const alive = players.filter(p => p.alive);
    const villains = alive.filter(p => p.alignment === "villain").length;
    const heroes = alive.filter(p => p.alignment === "hero").length;
    if (villains === 0) return { winnerId: "majority", winnerLabel: "heroes", ... };
    if (villains >= heroes) return { winnerId: "majority", winnerLabel: "villains", ... };
    return null;
  }
}

// domain/winConditions/VoteEliminatedWinCondition.ts
class VoteEliminatedWinCondition implements IWinCondition {
  readonly id = "vote_eliminated";
  evaluate(players) {
    // Check if any player with this win condition was vote-eliminated this round
    ...
  }
}
```

`Match` would hold a `WinConditionEvaluator` that iterates through registered conditions. Templates would reference which win condition applies to the player. Adding a new win condition = 1 new class + registration.

---

### 2.3 ResolutionState is a Grow-Only Bag

**Violated principle:** Open/Closed Principle

```typescript
// resolution/ResolutionState.ts
type ResolutionState = {
  protected: Set<string>;
  investigations: Map<string, string>;
};
```

Every new ability that communicates through shared state must modify this type. When you add:
- Roleblock → need a `roleblocked: Set<string>`
- Redirect → need a `redirects: Map<string, string>`
- Poison → need a `poisoned: Set<string>`
- Heal → need a `healed: Set<string>`

This type becomes a dumping ground.

**Proposed fix:** Make `ResolutionState` an extensible key-value store with type-safe accessors.

```typescript
// Option A: Typed keys (recommended)
class ResolutionState {
  private data = new Map<string, unknown>();

  getSet(key: string): Set<string> {
    if (!this.data.has(key)) this.data.set(key, new Set<string>());
    return this.data.get(key) as Set<string>;
  }

  getMap(key: string): Map<string, string> {
    if (!this.data.has(key)) this.data.set(key, new Map<string, string>());
    return this.data.get(key) as Map<string, string>;
  }
}

// Usage in ProtectEffect:
state.getSet("protected").add(targetId);

// Usage in KillEffect:
if (!state.getSet("protected").has(targetId)) { ... }
```

```typescript
// Option B: Symbol-keyed slots (stronger typing)
const PROTECTED = Symbol("protected");
const INVESTIGATIONS = Symbol("investigations");

class ResolutionState {
  private slots = new Map<symbol, unknown>();

  get<T>(key: symbol, factory: () => T): T {
    if (!this.slots.has(key)) this.slots.set(key, factory());
    return this.slots.get(key) as T;
  }
}

// In ProtectEffect:
const protectedSet = state.get(PROTECTED, () => new Set<string>());
protectedSet.add(targetId);
```

Either option means new effects own their state keys. No modification to `ResolutionState` itself.

---

### 2.4 Phase Transitions are Procedural

**Violated principle:** Open/Closed Principle

`advancePhase()` at `match.ts:165-182`:

```typescript
public advancePhase(): PhaseType {
  const currentPhase = this.getCurrentPhase();
  const next = this.phase.nextPhase();

  if (currentPhase === "voting") {
    this.tallyVotes();
    this.checkJesterWin();
  }
  if (next === "resolution") {
    this.resolveActions();
    this.checkWinCondition();
  }
  return next;
}
```

Every new phase-triggered behavior requires a new `if` block. Future needs:
- Game modes without voting (pure night-action deduction)
- Multiple action phases per round
- Custom phases (e.g., "betrayal", "trial", "defense")
- Per-phase hooks (timers, auto-skip, announcements)

**Proposed fix:** Phase transition hooks.

```typescript
type PhaseHook = (match: MatchContext) => void;

class PhaseManager {
  private onLeave = new Map<PhaseType, PhaseHook[]>();
  private onEnter = new Map<PhaseType, PhaseHook[]>();

  registerOnLeave(phase: PhaseType, hook: PhaseHook) { ... }
  registerOnEnter(phase: PhaseType, hook: PhaseHook) { ... }

  advance(context: MatchContext): PhaseType {
    const current = this.getCurrentPhase();
    this.onLeave.get(current)?.forEach(hook => hook(context));
    const next = this.nextPhase();
    this.onEnter.get(next)?.forEach(hook => hook(context));
    return next;
  }
}
```

Then during match setup:
```typescript
phaseManager.registerOnLeave("voting", (ctx) => ctx.tallyVotes());
phaseManager.registerOnLeave("voting", (ctx) => ctx.checkJesterWin());
phaseManager.registerOnEnter("resolution", (ctx) => ctx.resolveActions());
phaseManager.registerOnEnter("resolution", (ctx) => ctx.checkWinCondition());
```

Different game modes register different hooks. The `PhaseManager` itself never changes.

---

### 2.5 Repository Interfaces Live in Infrastructure

**Violated principle:** Dependency Inversion Principle

Currently:
```
application/StartMatchUseCase.ts
  → imports from infrastructure/persistence/MatchRepository.ts
  → imports from infrastructure/persistence/TemplateRepository.ts
```

In Clean Architecture, the **interface** should be defined in the application (or domain) layer. The infrastructure layer provides the **implementation**. The current structure means the application layer depends on the infrastructure layer for the interface definition, which inverts the intended dependency direction.

**Proposed fix:** Move interfaces to the domain or application layer.

```
domain/
  repositories/
    MatchRepository.ts      ← interface only
    TemplateRepository.ts   ← interface only

infrastructure/persistence/
  InMemoryMatchRepository.ts      ← implements domain interface
  InMemoryTemplateRepository.ts   ← implements domain interface
```

This is a file-move refactor. No logic changes.

---

### 2.6 Duplicate MatchStatus Types

**Violated principle:** DRY / Single Source of Truth

Two separate status type definitions:

```typescript
// domain/match.ts:20-24
export enum MatchStatus {
  LOBBY = "lobby",
  STARTED = "started",
  FINISHED = "finished",
}

// infrastructure/persistence/MatchRepository.ts:3
export type MatchStatus = "lobby" | "in_progress" | "finished";
```

These are the same concept expressed differently. The infrastructure one uses `"in_progress"` while the domain uses `"started"`. The `MatchSession.status` field is never actually read by any use case - they all call `session.match.getStatus()` instead, making the infrastructure status field dead code.

**Proposed fix:** Remove `status` from `MatchSession`. The canonical status lives on `Match`.

```typescript
export interface MatchSession {
  id: string;
  match: Match;
  createdAt: Date;
}
```

---

### 2.7 Template Assignment is Index-Based and Silent

**Location:** `match.ts:69-84`

```typescript
public start(templates: Template[]): void {
  if (this.status !== MatchStatus.LOBBY) {
    throw new MatchAlreadyStarted();
  }
  const templateMap = new Map(templates.map((t) => [t.id, t]));
  this.players.forEach((player, index) => {
    const template = templateMap.get(templates[index].id);
    if (template) {
      player.assignTemplate(template);
    }
  });
  this.status = MatchStatus.STARTED;
}
```

Problems:
1. If `templates.length < players.length`, some players silently get no template
2. If `templates.length > players.length`, extra templates are silently ignored
3. The `templateMap` construction is redundant - `templates[index]` already gives the template directly
4. No validation that every player received a template

**Proposed fix:**

```typescript
public start(templates: Template[]): void {
  if (this.status !== MatchStatus.LOBBY)
    throw new MatchAlreadyStarted();
  if (templates.length !== this.players.length)
    throw new TemplatePlayerCountMismatch(templates.length, this.players.length);

  this.players.forEach((player, index) => {
    player.assignTemplate(templates[index]);
  });

  this.status = MatchStatus.STARTED;
}
```

---

### 2.8 Zod Schemas Hardcode Ability IDs

**Location:** `matches.ts:33-37` and `templates.ts:16-24`

```typescript
// matches.ts
const submitActionSchema = z.object({
  abilityId: z.enum(["kill", "protect"]),   // ← hardcoded
  ...
});

// templates.ts
const templateSchema = z.object({
  abilities: z.array(z.object({
    id: z.enum(["kill", "protect"]),         // ← hardcoded
    ...
  })),
  ...
});
```

When `AbilityId` enum adds `"roleblock"` and `"investigate"`, these schemas silently reject valid requests. The domain and HTTP layers are out of sync.

**Proposed fix:** Derive the Zod enum from the `AbilityId` enum values.

```typescript
import { AbilityId } from "../../domain/ability";

const abilityIdValues = Object.values(AbilityId) as [string, ...string[]];

const submitActionSchema = z.object({
  abilityId: z.enum(abilityIdValues),
  ...
});
```

Now adding a new `AbilityId` value automatically updates validation.

---

### 2.9 No Target Validation

**Location:** `match.ts:86-97`, `player.ts:35-52`

`submitAction()` accepts any `targetIds` without checking:
- Whether targets exist as players
- Whether targets are alive (some abilities require live targets, others don't)
- Whether the actor is targeting themselves (some abilities allow this, others don't)
- Whether the correct number of targets is provided (kill = 1, bus driver = 2)

Currently `Player.act()` validates:
- Player has a template
- Player has the ability
- Player is alive (or ability allows dead use)

But target validation is entirely absent. Invalid targets silently pass through to the effect system, where `context.killPlayer()` will throw on a non-existent ID.

**Proposed fix:** Add target metadata to `Ability`:

```typescript
export class Ability {
  constructor(
    public readonly id: AbilityId,
    public readonly canUseWhenDead: boolean = false,
    public readonly targetCount: number = 1,
    public readonly canTargetSelf: boolean = false,
    public readonly requiresAliveTarget: boolean = true,
  ) {}
}
```

Then validate in `Match.submitAction()`:

```typescript
public submitAction(actorId: string, abilityId: AbilityId, targetIds: string[]): void {
  this.ensurePhase("action");
  const player = this.getPlayerByID(actorId);
  const action = player.act(abilityId, targetIds);

  const ability = player.getTemplate()!.getAbility(abilityId)!;
  if (targetIds.length !== ability.targetCount)
    throw new InvalidTargetCount(ability.targetCount, targetIds.length);
  for (const targetId of targetIds) {
    const target = this.getPlayerByID(targetId);  // throws PlayerNotFound
    if (ability.requiresAliveTarget && !target.isAlive())
      throw new PlayerIsDeadError();
    if (!ability.canTargetSelf && targetId === actorId)
      throw new CannotTargetSelf();
  }

  this.actionQueue.push(action);
}
```

---

### 2.10 ResolutionEvent is Defined but Unused

**Location:** `resolution/ResolutionEvent.ts`

```typescript
export type ResolutionEventType = "killed" | "protected" | "kill_blocked" | "action_failed";

export interface ResolutionEvent {
  type: ResolutionEventType;
  actorId: string;
  targetIds: string[];
  abilityId: AbilityId;
  message?: string;
}
```

This file exists but nothing emits or consumes events. There's no way for:
- Players to learn they were protected or roleblocked
- Investigation results to be delivered (the method exists on Match but no endpoint serves it)
- A "night summary" to be generated

**Proposed fix:** Integrate events into the resolution pipeline.

```typescript
// Add to ResolutionContext:
interface ResolutionContext {
  killPlayer(id: string): void;
  isPlayerAlive(id: string): boolean;
  getPlayerAlignment(id: string): string;
  emit(event: ResolutionEvent): void;  // ← new
}

// Effects emit events:
class KillEffect implements IAbilityEffect {
  execute(action, allActions, context, state) {
    if (action.cancelled) return;
    for (const targetId of action.targetIds) {
      if (!state.getSet("protected").has(targetId)) {
        context.killPlayer(targetId);
        context.emit({ type: "killed", actorId: action.actorId,
                       targetIds: [targetId], abilityId: action.abilityId });
      } else {
        context.emit({ type: "kill_blocked", actorId: action.actorId,
                       targetIds: [targetId], abilityId: action.abilityId });
      }
    }
  }
}
```

Events can then power a night-summary endpoint, player notifications, and game logs.

---

### 2.11 `ensurePhase()` Hardcodes Wrong Error Message

**Location:** `match.ts:120-125`

```typescript
private ensurePhase(expected: PhaseType) {
  const current = this.getCurrentPhase();
  if (current !== expected) {
    throw new WrongPhaseError("action", this.getCurrentPhase());
    //                         ^^^^^^^^ always says "action" regardless of expected
  }
}
```

The first argument to `WrongPhaseError` is always `"action"` instead of `expected`. This produces misleading error messages when called from `submitVote()` (which expects `"voting"`).

**Fix:**
```typescript
throw new WrongPhaseError(expected, this.getCurrentPhase());
```

---

## 3. Additional Design Concerns

### 3.1 Phase Order is Fixed

`PHASE_ORDER` is a const array: `["discussion", "voting", "action", "resolution"]`. There's no way to have:
- Games without a voting phase
- Games with multiple action phases per round
- Custom phases (trial, defense, betrayal)

This is acceptable now but will need to become configurable when game modes are introduced. The phase hook system proposed in 2.4 naturally supports this.

### 3.2 No Action Deduplication

A player can submit multiple actions in the same phase for the same ability. `submitAction()` pushes to the queue without checking for duplicates. Whether this is a bug or intentional (some designs allow multiple actions) should be made explicit.

### 3.3 Voting Logic Could Be Extracted

`tallyVotes()` is 36 lines of counting logic inside `Match`. As voting rules vary by game mode (weighted votes, minimum vote threshold, runoff voting, anonymous vs public), this should become a `VoteTallier` strategy.

### 3.4 No Game Mode / Match Configuration Object

There's no concept of a "game mode" or "match configuration" that bundles:
- Which phases to use
- Which win conditions apply
- Which voting rules to use
- Which effects are available
- Player count constraints

Currently all of this is implicit. When multiple game modes are needed, a configuration object that wires up the right strategies would be the natural extension point.

---

## 4. Prioritized Roadmap

Changes are ordered by: how much they unblock future feature work, and how safe they are to make.

### Phase 1: Quick Wins (No Architecture Change)

These are bug fixes and DRY improvements that can be done independently.

1. **Fix `ensurePhase()` error message** - `match.ts:123` uses `"action"` instead of `expected`
2. **Derive Zod schemas from `AbilityId` enum** - eliminates hardcoded ability lists in HTTP schemas
3. **Register RoleblockEffect and InvestigateEffect** in `AbilityEffectFactory` - they're implemented but not wired up
4. **Add template/player count validation** in `Match.start()`
5. **Remove duplicate `MatchStatus`** from `MatchRepository.ts`; use the domain enum

### Phase 2: Extract Win Conditions

This unblocks all future win condition work (Serial Killer, Survivor, Cult, etc.).

1. Define `IWinCondition` interface
2. Extract `MajorityWinCondition` (current hero/villain logic)
3. Extract `VoteEliminatedWinCondition` (current jester logic)
4. Create `WinConditionEvaluator` that iterates registered conditions
5. Move jester-specific state (`jesterWinners`, `endedByJesterWin`, `voteEliminatedThisRound`) out of `Match` and into the win condition

### Phase 3: Make ResolutionState Extensible

This unblocks all future effects that need shared state.

1. Replace the literal type with an extensible class (Option A or B from section 2.3)
2. Migrate `ProtectEffect` and `InvestigateEffect` to use the new API
3. Define state keys as constants exported alongside each effect

### Phase 4: Extract Match Responsibilities

The big refactor. Do this after Phases 2-3 so the extracted components have clean interfaces.

1. Extract `ActionResolver` - owns `resolveActions()`, `effectRegistry`, `actionQueue`
2. Extract `VoteTallier` - owns `tallyVotes()`, `voteQueue`
3. Move repository interfaces to `domain/repositories/`
4. Add target validation to `submitAction()`
5. Wire up `ResolutionEvent` emission in effects and expose events through a use case

### Phase 5: Configurable Game Modes

Build on the extracted components.

1. Introduce `PhaseManager` with transition hooks
2. Define a `GameModeConfig` that bundles phase order, win conditions, voting rules, and available effects
3. `Match` constructor accepts `GameModeConfig` instead of hardcoding behavior
4. Create preset configurations (Classic Mafia, Town of Salem-style, etc.)

---

## 5. Summary

The codebase has strong fundamentals. The effect system, layer separation, and domain error model are well-designed and should be preserved as-is. The main scaling bottleneck is that `Match` accumulates too many responsibilities, and extension points that should be pluggable (win conditions, phase transitions, resolution state, voting rules) are instead hardcoded.

The fixes are incremental. Each phase of the roadmap delivers standalone value and doesn't require the next phase to be useful. The end state is an engine where adding a new game mode means composing existing strategies - not modifying core code.
