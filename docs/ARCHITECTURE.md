# Social Deduction Game Engine - Architecture

## Overview

A flexible, extensible TypeScript engine for building social deduction games. Unlike fixed implementations (Werewolf, Mafia, Among Us), this engine provides a **role-agnostic framework** where users can create custom games with their own roles, abilities, and rules.

The application follows **Clean Architecture** with four distinct layers: Domain, Application, Infrastructure, and HTTP. Each layer has a single responsibility and dependencies point inward — the domain has no external dependencies.

**Core Philosophy:** Composition over configuration. Games are defined by combining:
- **Templates** (role definitions with abilities and alignment)
- **Abilities** (actions players can perform)
- **Effects** (how abilities modify game state)
- **Phases** (structured turn flow)

---

## Design Principles

1. **Extensibility First**: Adding new abilities requires minimal code (~20 lines: effect class + registration)
2. **No Hardcoded Roles**: All game mechanics are data-driven through templates and abilities
3. **Inter-Action Communication**: Effects can inspect and modify other actions (essential for social deduction mechanics like roleblocking, protection, redirection)
4. **Clean Separation**: Match orchestrates, Effects define behavior, State is immutable snapshots
5. **Type Safety**: Full TypeScript with strict mode, domain-driven error handling

---

## Architecture Overview

### Component Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                    HTTP Layer                       │
│          Express REST API (src/main.ts)             │
│     Zod validation · 11 endpoints · Error mapping   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                Application Layer                    │
│              11 Use Cases (orchestration)           │
│   CreateMatch · JoinMatch · StartMatch · ...        │
└─────────────┬────────────────────────┬──────────────┘
              │                        │
┌─────────────▼──────────┐  ┌─────────▼──────────────┐
│     Domain Layer       │  │  Infrastructure Layer   │
│  Match · Player ·      │  │  MatchRepository        │
│  Template · Effects    │  │  TemplateRepository     │
│  Vote · Errors         │  │  (in-memory impls)      │
└────────────────────────┘  └────────────────────────┘
```

### Resolution Pipeline

```
Action Phase           Resolution Phase
────────────          ───────────────────────────────

Player A: Kill B   →  1. Sort by priority
Player C: Protect B→  2. Execute effects in order:
Player D: Kill B   →     - Protect (priority 10) marks B as protected
                         - Kill    (priority 20) checks protection
                      3. context.killPlayer() for unprotected targets
                      4. Clear action queue
                      5. Check win condition
```

---

## File Structure

```
src/
├── main.ts                                  # Express server and all route handlers
│
├── domain/                                  # Pure business logic, no external deps
│   ├── match.ts                             # Core orchestrator (Match + MatchStatus)
│   ├── player.ts                            # Player entity with state
│   ├── template.ts                          # Role definition system
│   ├── ability.ts                           # Ability declarations (AbilityId enum)
│   ├── action.ts                            # Player action (mutable)
│   ├── vote.ts                              # Vote entity
│   ├── phase.ts                             # Phase cycle management
│   ├── errors.ts                            # Domain error types (9 errors)
│   │
│   ├── effects/                             # Effect system (Strategy pattern)
│   │   ├── IAbilityEffect.ts               # Effect interface
│   │   ├── EffectRegistry.ts               # AbilityId → Effect mapping
│   │   ├── AbilityEffectFactory.ts         # Registry initialization
│   │   ├── KillEffect.ts                   # Kill implementation (priority 20)
│   │   ├── ProtectEffect.ts                # Protect implementation (priority 10)
│   │   └── index.ts                        # Public exports
│   │
│   └── resolution/                          # Resolution subsystem
│       ├── ResolutionContext.ts             # Interface: killPlayer, isPlayerAlive
│       ├── ResolutionState.ts              # Temporary state (protected set)
│       └── ResolutionEvent.ts              # Event type definitions (future use)
│
├── application/                             # Use cases — orchestrate domain + repos
│   ├── match/
│   │   └── create_match.ts                 # CreateMatchUseCase
│   ├── JoinMatchUseCase.ts
│   ├── GetMatchUseCase.ts
│   ├── GetPlayerRoleUseCase.ts
│   ├── StartMatchUseCase.ts
│   ├── SubmitActionUseCase.ts
│   ├── SubmitVoteUseCase.ts
│   ├── AdvancePhaseUseCase.ts
│   ├── CreateTemplateUseCase.ts
│   ├── GetTemplateUseCase.ts
│   └── ListTemplatesUseCase.ts
│
├── infrastructure/
│   └── persistence/
│       ├── MatchRepository.ts              # Interface + MatchSession type
│       ├── InMemoryMatchRepository.ts      # In-memory implementation
│       ├── TemplateRepository.ts           # Interface
│       └── InMemoryTemplateRepository.ts   # In-memory implementation
│
└── __test__/
    ├── match.spec.ts                        # Domain unit tests
    └── e2e-game-flow.spec.ts               # Full game scenario tests
```

---

## Domain Layer

### 1. **Match** (`domain/match.ts`)
**Purpose:** Game orchestrator and state manager

**Responsibilities:**
- Player lifecycle (add, retrieve, eliminate)
- Phase progression (discussion → voting → action → resolution)
- Action and vote submission with phase validation
- Resolution pipeline execution (triggered automatically on `advancePhase`)
- Vote tallying (majority rules; ties result in no elimination)
- Win condition checking after each resolution

**Key Methods:**
```typescript
addPlayer(name: string): Player               // Only in LOBBY status
submitAction(actorId, abilityId, targetIds): void  // Only in "action" phase
submitVote(voterId, targetId): void           // Only in "voting" phase; replaces prior vote
advancePhase(): PhaseType                     // Triggers tally/resolve at phase boundaries
start(templates: Template[]): void            // Assigns templates and transitions to STARTED
getPlayers(): Player[]
getPlayerByID(id: string): Player
getCurrentPhase(): PhaseType
getStatus(): MatchStatus
getWinner(): "heroes" | "villains" | "draw" | null
```

**State:**
- `players: Player[]` - All players in the match
- `phase: Phase` - Current game phase
- `actionQueue: Action[]` - Pending night actions
- `voteQueue: Vote[]` - Pending day votes
- `effectRegistry: EffectRegistry` - Ability → Effect mapping
- `status: MatchStatus` - LOBBY | STARTED | FINISHED

**Phase Transition Side Effects:**
```
voting → action:      tallyVotes() → eliminate majority target (if no tie)
action → resolution:  resolveActions() → checkWinCondition()
```

---

### 2. **Player** (`domain/player.ts`)
**Purpose:** Represents a game participant

**Key Methods:**
```typescript
assignTemplate(template: Template): void
act(abilityId, targetIds): Action        // Creates validated action
eliminate(): void
isAlive(): boolean
getTemplate(): Template | null
```

**State:**
- `id: string` - UUID
- `name: string` - Display name
- `alive: boolean` - Survival status
- `template: Template | null` - Assigned role

---

### 3. **Template** (`domain/template.ts`)
**Purpose:** Defines player roles (data-driven, not hardcoded)

**Structure:**
```typescript
class Template {
  id: string              // e.g., "vigilante", "doctor"
  alignment: Alignment    // "hero" | "villain" | "neutral"
  abilities: Ability[]    // Available actions
  getAbility(id: AbilityId): Ability | undefined
}
```

---

### 4. **Vote** (`domain/vote.ts`)
**Purpose:** Represents a player's day-phase vote

```typescript
class Vote {
  voterId: string   // Who cast the vote
  targetId: string  // Who they voted to eliminate
}
```

Votes are submitted via `match.submitVote()` and accumulated in `voteQueue`. Each player can have at most one active vote — re-voting replaces the prior vote. Tallying occurs automatically when `advancePhase()` transitions away from "voting".

---

### 5. **Phase** (`domain/phase.ts`)
**Purpose:** Manages turn structure

**Cycle:**
```
discussion → voting → action → resolution → [repeat]
```

- Circular array iteration with `nextPhase()`
- Type-safe `PhaseType`: `"discussion" | "voting" | "action" | "resolution"`

---

### 6. **Action** (`domain/action.ts`)
**Purpose:** Represents a player's submitted ability action (mutable)

```typescript
class Action {
  actorId: string           // Who performed the action
  abilityId: AbilityId      // What ability was used
  targetIds: string[]       // Mutable — allows redirection effects
  cancelled: boolean        // Set by roleblock/jail effects
}
```

**Key Design:** Mutability enables inter-action communication — effects can inspect and modify each other's actions.

---

### 7. **Effect System** (`domain/effects/`)

#### **IAbilityEffect** (Interface)
```typescript
interface IAbilityEffect {
  readonly priority: number
  execute(
    action: Action,             // This action
    allActions: Action[],       // All queued actions (for inter-action inspection)
    context: ResolutionContext, // killPlayer, isPlayerAlive
    state: ResolutionState      // Temporary resolution state (protected set)
  ): void
}
```

**Why `allActions` parameter?** Essential for social deduction mechanics:
- **Roleblock**: Cancel actions by actor
- **Bus Driver**: Swap targets across all actions
- **Tracker**: See who a target interacted with

#### **EffectRegistry**
```typescript
registry.register(AbilityId.Kill, new KillEffect());
registry.getEffect(AbilityId.Protect) // → ProtectEffect instance
```

#### **Built-in Effects**

**ProtectEffect** (priority: 10)
- Marks targets as protected in `ResolutionState`
- Lower priority ensures execution before kills

**KillEffect** (priority: 20)
- Eliminates targets via `context.killPlayer()` unless protected
- Checks `state.protected` set before acting

**Priority Ordering:**
```
1-9:   Redirects, swaps
10-19: Protective actions
20-29: Offensive actions
30+:   Information gathering
```

---

### 8. **ResolutionContext** (`domain/resolution/ResolutionContext.ts`)
**Purpose:** Interface isolating effects from Match implementation

```typescript
interface ResolutionContext {
  killPlayer(id: string): void
  isPlayerAlive(id: string): boolean
}
```

Match creates a concrete implementation at resolution time. Effects use the context rather than calling Match methods directly, preventing circular coupling.

---

### 9. **ResolutionState** (`domain/resolution/ResolutionState.ts`)
**Purpose:** Temporary state for a single resolution cycle

```typescript
type ResolutionState = {
  protected: Set<string>;
  // Future: blocked, redirected, investigations, etc.
}
```

**Lifecycle:** Created at resolution start → modified by effects → discarded after resolution.

---

## Application Layer

Use cases coordinate domain objects and repositories. They contain no business logic — that lives in the domain.

### 1. **CreateMatchUseCase** (`application/match/create_match.ts`)
Creates a new match session in LOBBY status.
- Input: none
- Output: `{ matchId: string, status: "lobby", createdAt: Date }`

### 2. **JoinMatchUseCase** (`application/JoinMatchUseCase.ts`)
Adds a player to an existing match.
- Input: `matchId: string, playerName: string`
- Output: `{ playerId: string, playerName: string }`
- Throws: `MatchNotFound`, `MatchAlreadyStarted`

### 3. **GetMatchUseCase** (`application/GetMatchUseCase.ts`)
Retrieves current match state.
- Input: `matchId: string`
- Output: `{ matchId, status, phase, players: [...], winner }`
- Throws: `MatchNotFound`

### 4. **GetPlayerRoleUseCase** (`application/GetPlayerRoleUseCase.ts`)
Returns a player's assigned template with full ability list.
- Input: `matchId: string, playerId: string`
- Output: `{ playerId, playerName, alive, template: { id, alignment, abilities: [...] } }`
- Throws: `MatchNotFound`, `PlayerNotFound`

### 5. **StartMatchUseCase** (`application/StartMatchUseCase.ts`)
Starts a match by assigning templates to players in order.
- Input: `matchId: string, templateIds: string[]`
- Output: `{ matchId, status: "started" }`
- Throws: `MatchNotFound`, `MatchAlreadyStarted`, `InsufficientPlayers`, `TemplateNotFound`

### 6. **SubmitActionUseCase** (`application/SubmitActionUseCase.ts`)
Records a player's night ability action.
- Input: `matchId: string, actorId: string, abilityId: AbilityId, targetIds: string[]`
- Output: `{ actorId, abilityId, targetIds }`
- Throws: `MatchNotFound`, `WrongPhaseError`, `PlayerNotFound`, `AbilityDoesNotBelongToUser`, `PlayerIsDeadError`

### 7. **SubmitVoteUseCase** (`application/SubmitVoteUseCase.ts`)
Records a player's day-phase vote. Replaces any prior vote from the same player.
- Input: `matchId: string, voterId: string, targetId: string`
- Output: `{ voterId, targetId }`
- Throws: `MatchNotFound`, `WrongPhaseError`, `PlayerNotFound`, `PlayerIsDeadError`

### 8. **AdvancePhaseUseCase** (`application/AdvancePhaseUseCase.ts`)
Moves the match to the next phase, triggering vote tallying or action resolution as needed.
- Input: `matchId: string`
- Output: `{ phase: PhaseType, players: [...] }`
- Throws: `MatchNotFound`

### 9. **CreateTemplateUseCase** (`application/CreateTemplateUseCase.ts`)
Creates and stores a new role template.
- Input: `{ alignment: Alignment, abilities: [{ id: AbilityId, canUseWhenDead?: boolean }] }`
- Output: `{ templateId: string }`

### 10. **ListTemplatesUseCase** (`application/ListTemplatesUseCase.ts`)
Returns all available templates.
- Input: none
- Output: `Template[]`

### 11. **GetTemplateUseCase** (`application/GetTemplateUseCase.ts`)
Returns a single template by ID.
- Input: `templateId: string`
- Output: `Template`
- Throws: `TemplateNotFound`

---

## Infrastructure Layer

### Repository Interfaces

**MatchRepository** (`infrastructure/persistence/MatchRepository.ts`)
```typescript
interface MatchSession {
  id: string
  status: "lobby" | "in_progress" | "finished"
  match: Match
  createdAt: Date
}

interface MatchRepository {
  save(match: MatchSession): Promise<void>
  findById(id: string): Promise<MatchSession | null>
  delete(id: string): Promise<void>
}
```

**TemplateRepository** (`infrastructure/persistence/TemplateRepository.ts`)
```typescript
interface TemplateRepository {
  save(template: Template): Promise<void>
  findById(id: string): Promise<Template | null>
  findByIds(ids: string[]): Promise<Template[]>
  findAll(): Promise<Template[]>
}
```

### In-Memory Implementations

Both `InMemoryMatchRepository` and `InMemoryTemplateRepository` back their data with a `Map<string, T>`. All methods are async to match the interface contract, making them drop-in replacements for future persistent backends (database, Redis, etc.).

---

## HTTP API

All routes are defined in `src/main.ts` using Express v5. Inputs are validated with Zod schemas before reaching use cases. Domain errors are mapped to HTTP status codes by a shared `handleError` helper.

### Error Handling
```
DomainError with code "match_not_found" → 404
Any other DomainError                   → 400  { error: string, code: string }
Unexpected errors                       → 500  { error: "Internal server error" }
Zod validation failure                  → 400  { error: "Invalid request", details: ZodError }
```

### Endpoints

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| `POST` | `/matches` | Create a new match | 201 |
| `GET` | `/matches/:id` | Get match state | 200 |
| `GET` | `/matches/:matchId/players/:playerId/role` | Get player's role | 200 |
| `POST` | `/matches/:id/join` | Join match as a player | 200 |
| `POST` | `/matches/:id/start` | Start match with templates | 200 |
| `POST` | `/matches/:id/actions` | Submit night ability action | 200 |
| `POST` | `/matches/:id/votes` | Submit day vote | 200 |
| `POST` | `/matches/:id/advance-phase` | Advance to next phase | 200 |
| `GET` | `/templates` | List all templates | 200 |
| `GET` | `/templates/:id` | Get template by ID | 200 |
| `POST` | `/templates` | Create a new template | 201 |

### Request Schemas (Zod)

**POST /matches/:id/join**
```typescript
{ playerName: string }   // min length 1
```

**POST /templates**
```typescript
{
  alignment: "villain" | "hero" | "neutral",
  abilities: Array<{
    id: "kill" | "protect",
    canUseWhenDead?: boolean   // defaults to false
  }>
}
```

**POST /matches/:id/start**
```typescript
{ templateIds: string[] }   // one per player, assigned in join order
```

**POST /matches/:id/actions**
```typescript
{
  actorId: string,
  abilityId: "kill" | "protect",
  targetIds: string[]
}
```

**POST /matches/:id/votes**
```typescript
{ voterId: string, targetId: string }
```

---

## Key Workflows

### Full Game Loop

```typescript
// 1. Create match
POST /matches → { matchId }

// 2. Players join
POST /matches/:id/join { playerName: "Alice" } → { playerId }
POST /matches/:id/join { playerName: "Bob" }   → { playerId }

// 3. Create templates and start
POST /templates { alignment: "villain", abilities: [{ id: "kill" }] } → { templateId: t1 }
POST /templates { alignment: "hero",    abilities: [{ id: "protect" }] } → { templateId: t2 }
POST /matches/:id/start { templateIds: [t1, t2] }

// 4. Game loop (starts in "discussion" phase)
POST /matches/:id/advance-phase  → "voting"
POST /matches/:id/votes { voterId, targetId }
POST /matches/:id/advance-phase  → "action"   (tally votes, eliminate if majority)
POST /matches/:id/actions { actorId, abilityId: "kill", targetIds: [...] }
POST /matches/:id/advance-phase  → "resolution" (resolve actions, check win)
POST /matches/:id/advance-phase  → "discussion"
```

### Adding a New Ability

**Example: Roleblock**

1. **Define ability** (`domain/ability.ts`):
```typescript
enum AbilityId {
  Roleblock = "roleblock"
}
```

2. **Create effect** (`domain/effects/RoleblockEffect.ts`):
```typescript
export class RoleblockEffect implements IAbilityEffect {
  readonly priority = 5; // Executes before most actions

  execute(action: Action, allActions: Action[], context: ResolutionContext, state: ResolutionState): void {
    if (action.cancelled) return;
    for (const targetId of action.targetIds) {
      for (const a of allActions) {
        if (a.actorId === targetId) a.cancelled = true;
      }
    }
  }
}
```

3. **Register effect** (`domain/effects/AbilityEffectFactory.ts`):
```typescript
registry.register(AbilityId.Roleblock, new RoleblockEffect());
```

**That's it.** No changes to Match, Player, Action, or any use case.

---

## Error Handling

All errors extend `DomainError` with a unique `code` string.

```typescript
PlayerNotFound            // "player_not_found"
MatchNotFound             // "match_not_found"
MatchAlreadyStarted       // "match_already_started"
WrongPhaseError           // "wrong_phase"
MissingTemplate           // "template_not_found"  (player has no template)
TemplateNotFound          // "template_not_found"  (template ID not in repo)
AbilityDoesNotBelongToUser // "ability_not_found"
PlayerIsDeadError         // "player_dead"
InsufficientPlayers       // "insufficient_players"
```

**Validation Points:**
1. `Player.act()` — checks template assignment, ability ownership, alive status
2. `Match.submitAction()` — validates "action" phase
3. `Match.submitVote()` — validates "voting" phase, checks both voter and target are alive
4. `Match.addPlayer()` — requires LOBBY status
5. `Match.start()` — requires LOBBY status
6. `StartMatchUseCase` — requires ≥ 2 players and all templateIds resolvable
7. HTTP layer — Zod schema validation before any use case call

---

## Testing Strategy

Tests live in `src/__test__/`.

### Unit Tests (`match.spec.ts`)
Domain-focused tests covering Match class behavior:
- Player management (add, retrieve, missing player error)
- Phase lifecycle (starts in "discussion", circular progression)
- Player elimination
- Action validation (correct phase, template required, ability ownership, alive status)

### End-to-End Tests (`e2e-game-flow.spec.ts`)
Full multi-turn game scenarios testing the resolution pipeline through real use cases:

| Scenario | Setup | Outcome |
|----------|-------|---------|
| Villains win by attrition | 2 villains, 2 heroes (1 doctor, 1 citizen) | Villains win when equal heroes |
| Heroes eliminate all villains | 1 villain, 3 heroes | Heroes win when villain count = 0 |
| Coordinated villain strategy | 2 villains, 3 heroes | Villains win via vote + night kill combo |
| Protection blocks villain win | 1 villain, 2 heroes (1 doctor) | Heroes win; kill blocked by protect |

---

## Dependencies

**Runtime:**
- `express` (v5.2.x) - HTTP server and routing
- `zod` (v4.3.x) - Runtime schema validation for request bodies
- `node:crypto` - UUID generation

**Development:**
- `typescript` (v5.9.x) - Compiler
- `vitest` (v4.0.x) - Test runner
- `@vitest/coverage-v8` - Code coverage
- `tsx` (v4.21.x) - TypeScript execution for dev server
- `@types/express`, `@types/node` - Type definitions

**Scripts:**
```bash
npm run build        # Compile TypeScript
npm run build:watch  # Watch mode compilation
npm run typecheck    # Type check without emit
npm run dev          # Development server (tsx watch)
npm run test         # Run tests with Vitest
npm run coverage     # Run tests with coverage report
```

---

## Extensibility Model

### Why This Architecture Scales

**Separation of Concerns:**
- **Match**: Knows *when* to resolve (phase management)
- **Effects**: Know *how* to resolve (implementation)
- **Actions/Votes**: Are *data* that domain logic operates on
- **Registry**: Knows *which* effect handles each ability
- **Use Cases**: Know *what* to orchestrate (no business rules)
- **HTTP Layer**: Knows *how* to communicate (no application logic)

**Open/Closed Principle:**
- Open for extension (add new effects, new use cases, new endpoints)
- Closed for modification (existing code unchanged)

### Future Capabilities

**Passive Abilities** (e.g., Bulletproof, Commuter):
```typescript
interface IPassiveEffect {
  onBeingTargeted?(action: Action, state: ResolutionState): void;
  onResolutionStart?(context: ResolutionContext): void;
}
```

**Multi-Turn Effects** (e.g., Poison, Arson):
```typescript
type DelayedEffect = {
  effect: IAbilityEffect;
  action: Action;
  turnsRemaining: number;
};
```

**Persistent Storage:**
Swap `InMemoryMatchRepository` with a database-backed implementation — use cases and domain are unaffected.

---

## Future Considerations

### Scalability
- **Action indexing**: For games with 100+ players
- **Snapshot/Restore**: For replays and debugging
- **Priority groups**: Enum-based priority management

### Features
- Private information system (investigation results returned to players)
- Ability usage limits (1× per game, tracked on Action or Player)
- Conditional abilities (target constraints, e.g., "cannot target self")
- Chat/messaging integration
- WebSocket support for real-time phase updates

### Performance
Current O(n²) resolution acceptable for typical game sizes (5–30 players).
Optimize only if profiling shows bottlenecks.

---

## Summary

This engine provides:
- **Flexibility**: Create any social deduction game
- **Extensibility**: Add abilities without modifying core
- **Type Safety**: Full TypeScript with strict checks
- **Clean Architecture**: Domain isolated from infrastructure and HTTP
- **Scalability**: Proven patterns (Strategy, Registry, Factory, Repository)

**Not a Mafia game, not a Werewolf game — a framework to build them all.**
