# Social Deduction Game Engine - Architecture

## Overview

A flexible, extensible TypeScript engine for building social deduction games. Unlike fixed implementations (Werewolf, Mafia, Among Us), this engine provides a **role-agnostic framework** where users can create custom games with their own roles, abilities, and rules.

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
┌─────────────────────────────────────────────┐
│              Match (Orchestrator)           │
│  - Manages players, phases, action queue   │
│  - Coordinates resolution pipeline         │
└─────────────┬───────────────────────────────┘
              │
     ┌────────┴────────┐
     │                 │
┌────▼─────┐    ┌─────▼──────┐
│  Player  │    │   Phase    │
│  System  │    │   Manager  │
└──────────┘    └────────────┘
     │
┌────▼─────────────────────────────┐
│         Template System          │
│  (Role = Template + Abilities)   │
└──────────────────────────────────┘
              │
     ┌────────┴────────┐
     │                 │
┌────▼──────┐   ┌─────▼─────────┐
│  Action   │   │ Effect System │
│  Queue    │   │  (Registry)   │
└───────────┘   └───────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    ┌────▼────┐              ┌─────▼─────┐
    │  Kill   │              │  Protect  │
    │ Effect  │              │  Effect   │
    └─────────┘              └───────────┘
```

### Resolution Pipeline

```
Action Phase           Resolution Phase
────────────          ───────────────────

Player A: Kill B   →  1. Sort by priority
Player C: Protect B→  2. Execute effects in order:
Player D: Kill B   →     - Protect (priority 10)
                         - Kill    (priority 20)
                      3. State modifications
                      4. Clear action queue
```

---

## File Structure

```
src/
├── match.ts                          # Core orchestrator
├── player.ts                         # Player entity with state
├── template.ts                       # Role definition system
├── ability.ts                        # Ability declarations
├── action.ts                         # Player action (mutable)
├── phase.ts                          # Phase cycle management
├── errors.ts                         # Domain error types
│
├── effects/                          # Effect system (Strategy pattern)
│   ├── IAbilityEffect.ts            # Effect interface
│   ├── EffectRegistry.ts            # AbilityId → Effect mapping
│   ├── AbilityEffectFactory.ts      # Registry initialization
│   ├── KillEffect.ts                # Kill implementation
│   ├── ProtectEffect.ts             # Protect implementation
│   └── index.ts                     # Public exports
│
├── resolution/                       # Resolution subsystem
│   ├── ResolutionState.ts           # Temporary state (protected, blocked, etc.)
│   └── ResolutionEvent.ts           # Event type definitions (future use)
│
└── test/
    └── match.spec.ts                # Integration tests
```

---

## Core Components

### 1. **Match** (`match.ts`)
**Purpose:** Game orchestrator and state manager

**Responsibilities:**
- Player lifecycle (add, retrieve, eliminate)
- Phase progression (discussion → voting → action → resolution)
- Action submission and validation
- Resolution pipeline execution

**Key Methods:**
```typescript
addPlayer(name: string): Player
submitAction(actorId, abilityId, targetIds): void
resolveActions(): void                    // Executes resolution pipeline
nextPhase(): PhaseType
```

**State:**
- `players: Player[]` - All players in the match
- `phase: Phase` - Current game phase
- `actionQueue: Action[]` - Pending actions
- `effectRegistry: EffectRegistry` - Ability→Effect mapping

---

### 2. **Player** (`player.ts`)
**Purpose:** Represents a game participant

**Responsibilities:**
- Alive/dead state tracking
- Template (role) assignment
- Action creation with validation

**Key Methods:**
```typescript
assignTemplate(template: Template): void
act(abilityId, targetIds): Action        // Creates validated action
eliminate(): void
isAlive(): boolean
```

**State:**
- `id: string` - Unique identifier
- `name: string` - Display name
- `alive: boolean` - Survival status
- `template: Template | null` - Assigned role

---

### 3. **Template** (`template.ts`)
**Purpose:** Defines player roles (NOT hardcoded like "Mafia" or "Doctor")

**Responsibilities:**
- Store role metadata (id, alignment, abilities)
- Ability lookup for validation

**Structure:**
```typescript
class Template {
  id: string              // e.g., "vigilante", "doctor"
  alignment: Alignment    // Hero | Villain | Neutral
  abilities: Ability[]    // Available actions
}
```

**Usage Pattern:**
```typescript
const customRole = new Template("bodyguard", Alignment.Hero, [
  new Ability(AbilityId.Protect),
  new Ability(AbilityId.Kill, false) // can't use when dead
]);
```

---

### 4. **Phase** (`phase.ts`)
**Purpose:** Manages turn structure

**Cycle:**
```
discussion → voting → action → resolution → [repeat]
```

**Implementation:**
- Circular array iteration
- Type-safe phase tracking
- No state beyond current phase

---

### 5. **Action** (`action.ts`)
**Purpose:** Represents a player's submitted action (NOT immutable)

**Key Design:** Mutable to enable inter-action communication

**Properties:**
```typescript
actorId: string           // Who performed the action
abilityId: AbilityId      // What ability was used
targetIds: string[]       // Mutable - allows redirection
cancelled: boolean        // Set by roleblock/jail effects
```

---

### 6. **Effect System** (`effects/`)

#### **IAbilityEffect** (Interface)
Defines how abilities modify game state

```typescript
interface IAbilityEffect {
  priority: number          // Lower = executes first
  execute(
    action: Action,         // This action
    allActions: Action[],   // All queued actions (for inspection/modification)
    match: Match,           // Game state access
    state: ResolutionState  // Temporary resolution state
  ): void
}
```

**Why `allActions` parameter?**
Essential for social deduction mechanics:
- **Roleblock**: Cancel actions by actor
- **Bus Driver**: Swap targets across all actions
- **Tracker**: See who target interacted with

#### **EffectRegistry**
Maps ability IDs to effect implementations

```typescript
registry.register(AbilityId.Kill, new KillEffect());
registry.getEffect(AbilityId.Protect) // → ProtectEffect instance
```

#### **Built-in Effects**

**ProtectEffect** (priority: 10)
- Marks targets as protected in resolution state
- Lower priority ensures it executes before kills

**KillEffect** (priority: 20)
- Eliminates targets unless protected
- Checks `state.protected` set before eliminating

**Priority Ordering:**
```
1-9:   Redirects, swaps
10-19: Protective actions
20-29: Offensive actions
30+:   Information gathering
```

---

### 7. **Resolution State** (`resolution/ResolutionState.ts`)

**Purpose:** Temporary state for single resolution cycle

**Design:** Simple type (NOT a class) to avoid circular dependencies

```typescript
type ResolutionState = {
  protected: Set<string>;
  // Future: blocked, redirected, investigated, etc.
}
```

**Lifecycle:**
1. Created at resolution start
2. Modified by effects during execution
3. Discarded after resolution completes

**Extensibility:**
```typescript
type ResolutionState = {
  protected: Set<string>;
  blocked: Set<string>;              // Roleblocked players
  redirected: Map<string, string>;   // Target redirects
  investigations: Map<string, any>;  // Investigation results
}
```

---

## Key Workflows

### Creating a Custom Game

```typescript
// 1. Define abilities
enum AbilityId {
  Kill = "kill",
  Protect = "protect",
  Investigate = "investigate",  // Custom
}

// 2. Create templates (roles)
const detective = new Template("detective", Alignment.Hero, [
  new Ability(AbilityId.Investigate)
]);

const assassin = new Template("assassin", Alignment.Villain, [
  new Ability(AbilityId.Kill)
]);

// 3. Setup match
const match = new Match();
const p1 = match.addPlayer("Alice");
const p2 = match.addPlayer("Bob");

p1.assignTemplate(detective);
p2.assignTemplate(assassin);

// 4. Run game loop
match.nextPhase(); // → voting
match.nextPhase(); // → action

match.submitAction(p2.id, AbilityId.Kill, [p1.id]);

match.nextPhase(); // → resolution
match.resolveActions(); // Executes kill
```

### Adding a New Ability

**Example: Roleblock**

1. **Define ability** (in `ability.ts`):
```typescript
enum AbilityId {
  Roleblock = "roleblock"
}
```

2. **Create effect** (new file `effects/RoleblockEffect.ts`):
```typescript
export class RoleblockEffect implements IAbilityEffect {
  readonly priority = 5; // Executes before most actions

  execute(action: Action, allActions: Action[], match: Match, state: ResolutionState): void {
    if (action.cancelled) return;

    for (const targetId of action.targetIds) {
      // Cancel all actions by blocked player
      for (const a of allActions) {
        if (a.actorId === targetId) {
          a.cancelled = true;
        }
      }
    }
  }
}
```

3. **Register effect** (in `effects/AbilityEffectFactory.ts`):
```typescript
registry.register(AbilityId.Roleblock, new RoleblockEffect());
```

**That's it!** No changes to Match, Player, or Action classes.

---

## Extensibility Model

### Why This Architecture Scales

**Separation of Concerns:**
- **Match**: Knows *when* to resolve (phase management)
- **Effects**: Know *how* to resolve (implementation)
- **Actions**: Are *data* that effects operate on
- **Registry**: Knows *which* effect handles each ability

**Open/Closed Principle:**
- Open for extension (add new effects)
- Closed for modification (existing code unchanged)

### Future Capabilities

**Passive Abilities** (e.g., Bulletproof, Commuter):
```typescript
interface IPassiveEffect {
  onBeingTargeted?(action: Action, state: ResolutionState): void;
  onResolutionStart?(match: Match): void;
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

**Event System** (for UI/logging):
```typescript
type ResolutionEvent = {
  type: "killed" | "protected" | "blocked";
  actorId: string;
  targetIds: string[];
  success: boolean;
};
```

---

## Error Handling

**Domain-Driven Design:**
All errors extend `DomainError` with unique codes

```typescript
PlayerNotFound         // "player_not_found"
WrongPhaseError        // "wrong_phase"
MissingTemplate        // "template_not_found"
AbilityDoesNotBelongToUser // "ability_not_found"
PlayerIsDeadError      // "player_dead"
```

**Validation Points:**
1. **Player.act()**: Checks template, ability ownership, alive status
2. **Match.submitAction()**: Validates phase
3. **Match.resolveActions()**: Validates phase
4. **Effects**: Runtime checks (protected status, etc.)

---

## Testing Strategy

**Unit Tests:**
- Individual effects in isolation
- Registry operations
- Phase transitions
- Player state management

**Integration Tests:**
- Full resolution pipeline
- Multi-effect interactions (protect + kill)
- Edge cases (multiple kills, dead targets)

**Example:**
```typescript
describe("Resolution", () => {
  it("protect blocks kill on same target", () => {
    const match = new Match();
    const killer = match.addPlayer("Killer");
    const doctor = match.addPlayer("Doctor");
    const victim = match.addPlayer("Victim");

    // Assign templates...
    // Submit actions...
    match.resolveActions();

    expect(victim.isAlive()).toBe(true);
  });
});
```

---

## Dependencies

**Runtime:**
- `node:crypto` (UUID generation)

**Development:**
- `typescript` (v5.9.3)
- `vitest` (v4.0.18) - Testing framework
- `tsx` (v4.21.0) - TypeScript execution
- `@vitest/coverage-v8` - Code coverage

**Scripts:**
```bash
npm run build        # Compile TypeScript
npm run test         # Run tests with Vitest
npm run dev          # Watch mode execution
npm run typecheck    # Type checking without emit
```

---

## Future Considerations

### Scalability
- **Action indexing**: For games with 100+ players
- **Snapshot/Restore**: For replays and debugging
- **Priority groups**: Enum-based priority management

### Features
- Private information system (investigation results)
- Ability usage limits (1x per game)
- Conditional abilities (target constraints)
- Vote tallying system (for voting phase)
- Chat/messaging integration

### Performance
Current O(n²) resolution acceptable for typical game sizes (5-30 players).
Optimize only if profiling shows bottlenecks.

---

## Summary

This engine provides:
- ✅ **Flexibility**: Create any social deduction game
- ✅ **Extensibility**: Add abilities without modifying core
- ✅ **Type Safety**: Full TypeScript with strict checks
- ✅ **Clean Architecture**: SOLID principles throughout
- ✅ **Scalability**: Proven patterns (Strategy, Registry, Factory)

**Not a Mafia game, not a Werewolf game—a framework to build them all.**
