# Social Deduction Game - Action Resolution System Plan

## Current State Analysis

### ✅ What We Have

**Strong Foundation:**
- **Match orchestrator** (`src/match.ts`) - Manages players, phases, and action queue
- **Phase system** (`src/phase.ts`) - Clean cycle: discussion → voting → action → resolution
- **Player model** (`src/player.ts`) - State management (alive/dead), template assignment, action creation
- **Template system** (`src/template.ts`) - Flexible role composition with abilities and alignment
- **Ability definitions** (`src/ability.ts`) - Kill and Protect already defined
- **Action queue** (`src/match.ts:17`) - Actions being collected but not processed
- **Comprehensive tests** (`src/test/match.spec.ts`) - Good validation coverage

**Good Design Decisions:**
- ✓ Separation of concerns (Player, Template, Ability, Action)
- ✓ Validation throughout (phase checks, ability ownership, dead player checks)
- ✓ Template-based roles (very flexible for future expansion)
- ✓ Domain-driven error handling

### ❌ What's Missing

**Critical Gap - Action Resolution:**
1. ❌ No logic to **process** the `actionQueue`
2. ❌ No **effect system** - abilities don't actually do anything yet
3. ❌ No **priority/ordering** - what executes first?
4. ❌ No **conflict resolution** - what if someone is both killed and protected?
5. ❌ No way to **clear** the queue after resolution
6. ❌ No feedback about what happened during resolution

**For Demo:**
- Need to actually apply Kill and Protect effects
- Need resolution logic during "resolution" phase
- Need to handle edge cases (dead target, multiple actions on same target)
- Need to show what happened (events/logs)

---

## ✅ Implemented Architecture

### The Key Insight: Effects Must See Other Actions

In social deduction games, abilities don't just modify game state - they **interact with other actions**:
- **Roleblock** cancels another player's action
- **Bus Driver** swaps targets between actions
- **Protect** shields from kill
- **Redirect** changes who gets targeted

This means effects need access to:
1. Their own action
2. **All other actions in the queue** (to modify/inspect them)
3. The Match (to read/modify game state)
4. Temporary resolution state (protected players, blocks, etc.)

### 1. **Strategy Pattern** for Ability Effects

Each ability gets its own effect implementation:

```typescript
interface IAbilityEffect {
  readonly priority: number; // Lower = executes first
  execute(
    action: Action,           // This action
    allActions: Action[],     // All actions (can modify others!)
    match: Match,             // Game state
    state: ResolutionState    // Temporary resolution state
  ): void;
}

class ProtectEffect implements IAbilityEffect {
  priority = 10;
  execute(action, allActions, match, state) {
    if (action.cancelled) return;
    for (const targetId of action.targetIds) {
      state.protected.add(targetId);
    }
  }
}

class KillEffect implements IAbilityEffect {
  priority = 20;
  execute(action, allActions, match, state) {
    if (action.cancelled) return;
    for (const targetId of action.targetIds) {
      if (!state.protected.has(targetId)) {
        match.eliminatePlayer(targetId);
      }
    }
  }
}
```

**Benefits:**
- Effects can cancel/modify other actions
- Effects can inspect what others are doing
- Easy to add complex interactions (roleblock, redirect)
- Each ability is isolated and testable
- Clear separation of concerns

### 2. **Mutable Action** for Inter-Action Communication

Actions are data structures that effects can modify:

```typescript
class Action {
  public cancelled: boolean = false;  // Can be set by roleblock

  constructor(
    public readonly actorId: string,
    public readonly abilityId: AbilityId,
    public targetIds: string[]         // Mutable for redirects!
  ) {}
}
```

This enables:
- Roleblock sets `cancelled = true`
- Bus driver modifies `targetIds`
- Effects check `cancelled` before executing

### 3. **Registry Pattern** for Effect Mapping

Map ability IDs to their implementations:

```typescript
class EffectRegistry {
  private effects: Map<AbilityId, IAbilityEffect>;

  register(abilityId: AbilityId, effect: IAbilityEffect): void;
  getEffect(abilityId: AbilityId): IAbilityEffect | undefined;
}

class AbilityEffectFactory {
  static createRegistry(): EffectRegistry {
    const registry = new EffectRegistry();
    registry.register(AbilityId.Kill, new KillEffect());
    registry.register(AbilityId.Protect, new ProtectEffect());
    return registry;
  }
}
```

**Benefits:**
- Centralized ability-to-effect mapping
- Easy to extend without modifying Match
- Factory pattern keeps Match constructor clean

### 4. **Simple Resolution State** (NOT a heavy Context object)

Just a lightweight state bag for THIS resolution only:

```typescript
type ResolutionState = {
  protected: Set<string>;
  // Future: blocked, silenced, redirected, etc.
};
```

**Why NOT a class:**
- No circular dependencies (Match ↔ Context)
- No ceremony
- Easy to extend with new fields
- Passed as simple data

### 5. **Match Orchestrates Resolution**

Match owns the resolution pipeline:

```typescript
public resolveActions(): void {
  this.ensurePhase("resolution");

  const state: ResolutionState = {
    protected: new Set<string>(),
  };

  // Sort by priority
  const actionEffectPairs = this.actionQueue
    .map(action => ({ action, effect: this.effectRegistry.getEffect(action.abilityId) }))
    .filter(pair => pair.effect !== undefined)
    .sort((a, b) => a.effect!.priority - b.effect!.priority);

  // Execute in order
  for (const { action, effect } of actionEffectPairs) {
    effect!.execute(action, this.actionQueue, this, state);
  }

  this.actionQueue = [];
}
```

**Why this is clean:**
- Match coordinates
- No separate ActionResolver class (unnecessary indirection)
- Effects define behavior
- ResolutionState is local and temporary

---

## Architecture Improvements

### Current Issues

1. **`Action` is just data** - No behavior attached
2. **No way to know what an ability does** - ID alone doesn't tell us
3. **Player state changes are manual** - `eliminatePlayer()` called directly
4. **No extensibility** - Adding new abilities requires changing multiple places

### ✅ Actual Structure (Simplified)

```
src/
├── effects/
│   ├── IAbilityEffect.ts          (interface - defines effect contract)
│   ├── EffectRegistry.ts          (maps AbilityId → Effect)
│   ├── AbilityEffectFactory.ts    (creates and registers effects)
│   ├── KillEffect.ts              (kill implementation)
│   ├── ProtectEffect.ts           (protect implementation)
│   └── index.ts                   (exports)
│
├── resolution/
│   └── ResolutionState.ts         (simple type, not a class!)
│
├── action.ts                      (now mutable: cancelled, targetIds)
├── match.ts                       (includes resolveActions method)
└── test/
    └── match.spec.ts              (existing tests)
    └── resolution.spec.ts         (TODO: add resolution tests)
```

**What we DIDN'T need:**
- ❌ ResolutionContext class (too heavy, circular deps)
- ❌ ActionResolver class (unnecessary abstraction)
- ❌ ResolutionEvent system (YAGNI for now - can add later)

---

## ✅ Implementation Complete

### Phase 1: Action Mutability ✅

**Modified:**
- `src/action.ts`

**Changes:**
1. Added `cancelled: boolean = false` flag
2. Changed `targetIds` from `readonly` to mutable
3. Constructor param renamed: `actionId` → `actorId` for clarity

### Phase 2: Effect System Foundation ✅

**Created:**
- `src/effects/IAbilityEffect.ts`
- `src/effects/EffectRegistry.ts`
- `src/effects/index.ts`

**Implementation:**
1. `IAbilityEffect` interface with:
   - `execute(action, allActions, match, state): void` (KEY: allActions parameter!)
   - `priority: number` (readonly property)
2. `EffectRegistry` class:
   - Store map of `AbilityId → IAbilityEffect`
   - `register(abilityId, effect)` method
   - `getEffect(abilityId)` method (returns `undefined` if not found)

### Phase 3: Resolution State ✅

**Created:**
- `src/resolution/ResolutionState.ts`

**Implementation:**
- Simple type (NOT a class):
  ```typescript
  type ResolutionState = {
    protected: Set<string>;
  };
  ```

### Phase 4: Kill & Protect Effects ✅

**Created:**
- `src/effects/KillEffect.ts`
- `src/effects/ProtectEffect.ts`
- `src/effects/AbilityEffectFactory.ts`

**Implementation:**
1. **ProtectEffect** (priority: 10):
   - Checks if action is cancelled
   - Marks all targetIds as protected in state
2. **KillEffect** (priority: 20):
   - Checks if action is cancelled
   - Checks if target is protected
   - If not protected: eliminates player via `match.eliminatePlayer()`
3. **AbilityEffectFactory**:
   - Static `createRegistry()` method
   - Registers Kill and Protect effects

### Phase 5: Match Integration ✅

**Modified:**
- `src/match.ts`

**Changes:**
1. Added `effectRegistry: EffectRegistry` field
2. Constructor initializes registry via `AbilityEffectFactory.createRegistry()`
3. Added `resolveActions(): void` method:
   - Validates "resolution" phase
   - Creates ResolutionState
   - Maps actions to effects
   - Sorts by priority
   - Executes effects
   - Clears actionQueue

### Phase 6: Testing (TODO)

**Files to Create:**
- `src/test/resolution.spec.ts`

**Test Cases:**
1. ✓ Kill eliminates alive player
2. ✓ Protect prevents kill on same target
3. ✓ Multiple kills on same target (only one event)
4. ✓ Kill on already dead player (no effect)
5. ✓ Protect on dead player (still works)
6. ✓ Priority ordering (protect executes before kill)
7. ✓ Resolution only works in resolution phase
8. ✓ Action queue clears after resolution
9. ✓ Events are returned correctly
10. ✓ Multiple protects on same target
11. ✓ Self-targeting (kill self, protect self)

### Phase 6: Demo Implementation

**Files to Create:**
- `src/demo.ts` or `examples/basic-demo.ts`

**Demo Flow:**
```typescript
// 1. Setup match
const match = new Match();

// 2. Create players
const mafia = match.addPlayer("Mafia Boss");
const doctor = match.addPlayer("Town Doctor");
const citizen = match.addPlayer("Innocent Citizen");

// 3. Assign templates
const mafiaTemplate = new Template("mafia", Alignment.Villain, [
  new Ability(AbilityId.Kill)
]);
const doctorTemplate = new Template("doctor", Alignment.Hero, [
  new Ability(AbilityId.Protect)
]);

mafia.assignTemplate(mafiaTemplate);
doctor.assignTemplate(doctorTemplate);

// 4. Advance to action phase
match.nextPhase(); // → voting
match.nextPhase(); // → action

// 5. Submit actions
match.submitAction(mafia.id, AbilityId.Kill, [citizen.id]);
match.submitAction(doctor.id, AbilityId.Protect, [citizen.id]);

// 6. Advance to resolution phase
match.nextPhase(); // → resolution

// 7. Resolve actions
const events = match.resolveActions();

// 8. Display results
console.log("Resolution Events:");
events.forEach(event => {
  console.log(`- ${event.type}: ${event.actorId} → ${event.targetIds}`);
});

console.log("\nPlayer Status:");
match.getPlayers().forEach(p => {
  console.log(`- ${p.name}: ${p.isAlive() ? 'ALIVE' : 'DEAD'}`);
});
```

**Expected Output:**
```
Resolution Events:
- protected: <doctor-id> → [<citizen-id>]
- kill_blocked: <mafia-id> → [<citizen-id>]

Player Status:
- Mafia Boss: ALIVE
- Town Doctor: ALIVE
- Innocent Citizen: ALIVE (protected!)
```

---

## Future Scalability Considerations

### Easy to Add New Abilities

**Example: Roleblock**
```typescript
class RoleblockEffect implements IAbilityEffect {
  priority = 5; // Block happens before most actions

  execute(action: Action, allActions: Action[], match: Match, state: ResolutionState): void {
    if (action.cancelled) return;

    for (const targetId of action.targetIds) {
      // Cancel all actions by this player
      for (const a of allActions) {
        if (a.actorId === targetId) {
          a.cancelled = true;
        }
      }
    }
  }
}

// Register it
AbilityId.Roleblock = "roleblock";
registry.register(AbilityId.Roleblock, new RoleblockEffect());
```

**Example: Investigate**
```typescript
class InvestigateEffect implements IAbilityEffect {
  priority = 15; // Information gathering

  execute(action: Action, allActions: Action[], match: Match, state: ResolutionState): void {
    if (action.cancelled) return;

    for (const targetId of action.targetIds) {
      const target = match.getPlayerByID(targetId);
      const alignment = target.getTemplate()?.alignment;

      // Store result in state for actor to retrieve
      if (!state.investigations) state.investigations = new Map();
      state.investigations.set(action.actorId, { targetId, alignment });
    }
  }
}
```

**Example: Bus Driver (Redirect)**
```typescript
class BusDriverEffect implements IAbilityEffect {
  priority = 3; // Redirect happens very early

  execute(action: Action, allActions: Action[], match: Match, state: ResolutionState): void {
    if (action.cancelled) return;
    if (action.targetIds.length < 2) return;

    const [targetA, targetB] = action.targetIds;

    // Swap all actions targeting these players
    for (const a of allActions) {
      a.targetIds = a.targetIds.map(id => {
        if (id === targetA) return targetB;
        if (id === targetB) return targetA;
        return id;
      });
    }
  }
}
```

### Extending ResolutionState

As you add abilities, extend the state type:

```typescript
type ResolutionState = {
  protected: Set<string>;
  blocked: Set<string>;           // Roleblock victims
  redirected: Map<string, string>; // Player redirects
  investigations: Map<string, any>; // Investigation results (private to actor)
  // etc.
};
```

---

## 🧠 Considerations for Future Improvements

### 1. **Event/Logging System**

**Problem:** Currently no way to know what happened during resolution

**Solution:** Add optional event return from effects or track in state

```typescript
type ResolutionEvent = {
  type: string;
  actorId: string;
  targetIds: string[];
  success: boolean;
  message?: string;
};

type ResolutionState = {
  protected: Set<string>;
  events: ResolutionEvent[];  // Track what happened
};

// In effects:
execute(action, allActions, match, state) {
  state.events.push({
    type: 'protected',
    actorId: action.actorId,
    targetIds: action.targetIds,
    success: true
  });
}
```

**When to add:** When you need UI feedback or game logs

---

### 2. **Ability Usage Limits**

**Problem:** Some abilities should have limited uses (1x per game, X per night)

**Options:**

**A. Track in Player/Template:**
```typescript
class Template {
  private abilityUses: Map<AbilityId, number> = new Map();

  canUseAbility(abilityId: AbilityId): boolean {
    const uses = this.abilityUses.get(abilityId) ?? 0;
    const limit = this.getAbility(abilityId)?.maxUses ?? Infinity;
    return uses < limit;
  }

  recordAbilityUse(abilityId: AbilityId): void {
    this.abilityUses.set(abilityId, (this.abilityUses.get(abilityId) ?? 0) + 1);
  }
}
```

**B. Track in Match:**
```typescript
class Match {
  private abilityUsageCount: Map<string, Map<AbilityId, number>> = new Map();
  // playerId → abilityId → count
}
```

**When to add:** When you need abilities like "Doctor has 1 self-heal per game"

---

### 3. **Multi-Turn Effects (Poison, Arson)**

**Problem:** Some effects don't resolve immediately

**Solution:** Add delayed effects queue

```typescript
type DelayedEffect = {
  effect: IAbilityEffect;
  action: Action;
  turnsRemaining: number;
};

class Match {
  private delayedEffects: DelayedEffect[] = [];

  public resolveActions(): void {
    // ... normal resolution ...

    // Add delayed effects
    // Process delayed effects
    this.delayedEffects = this.delayedEffects
      .map(de => ({ ...de, turnsRemaining: de.turnsRemaining - 1 }))
      .filter(de => {
        if (de.turnsRemaining === 0) {
          de.effect.execute(de.action, [], this, state);
          return false;
        }
        return true;
      });
  }
}
```

**When to add:** When you need Poisoner, Arsonist, etc.

---

### 4. **Private Information Handling**

**Problem:** Investigations should only be visible to the actor

**Options:**

**A. Per-player state:**
```typescript
class Match {
  private playerPrivateInfo: Map<string, any> = new Map();

  public getPrivateInfo(playerId: string): any {
    return this.playerPrivateInfo.get(playerId);
  }
}
```

**B. Return from resolveActions:**
```typescript
type ResolutionResult = {
  publicEvents: ResolutionEvent[];
  privateInfo: Map<string, any>;  // playerId → their private info
};

public resolveActions(): ResolutionResult {
  // ...
  return { publicEvents, privateInfo };
}
```

**When to add:** When you add investigative abilities

---

### 5. **Passive Abilities**

**Problem:** Some abilities are always active (Bulletproof, Commuter)

**Solution:** Hook system or separate passive effect interface

```typescript
interface IPassiveEffect {
  onBeingTargeted?(action: Action, match: Match, state: ResolutionState): void;
  onResolutionStart?(match: Match, state: ResolutionState): void;
  onResolutionEnd?(match: Match, state: ResolutionState): void;
}

class BulletproofPassive implements IPassiveEffect {
  constructor(private playerId: string) {}

  onBeingTargeted(action: Action, match: Match, state: ResolutionState): void {
    if (action.abilityId === AbilityId.Kill) {
      if (action.targetIds.includes(this.playerId)) {
        state.protected.add(this.playerId);
      }
    }
  }
}
```

**When to add:** When you need passive/reactive abilities

---

### 6. **Action Validation & Constraints**

**Problem:** Some abilities have constraints (alive targets only, same alignment, etc.)

**Solution:** Add validation to effects or submitAction

```typescript
interface IAbilityEffect {
  priority: number;
  validate?(action: Action, match: Match): boolean;
  execute(action: Action, allActions: Action[], match: Match, state: ResolutionState): void;
}

class KillEffect implements IAbilityEffect {
  validate(action: Action, match: Match): boolean {
    // Can't kill dead players
    return action.targetIds.every(id => {
      const player = match.getPlayerByID(id);
      return player.isAlive();
    });
  }
}
```

**When to add:** When you need complex targeting rules

---

### 7. **Priority Groups/Phases**

**Problem:** Numeric priorities can become unwieldy with 50+ abilities

**Solution:** Use priority groups

```typescript
enum ResolutionPhase {
  Redirect = 0,        // Bus driver, witch
  Block = 100,         // Roleblock, jail
  Defense = 200,       // Protect, heal
  Offense = 300,       // Kill, convert
  Investigation = 400, // Cop, tracker
}

class ProtectEffect implements IAbilityEffect {
  priority = ResolutionPhase.Defense + 0;
}

class KillEffect implements IAbilityEffect {
  priority = ResolutionPhase.Offense + 0;
}
```

**When to add:** When managing priorities becomes confusing

---

### 8. **Undo/Rollback**

**Problem:** Need to test scenarios or handle disconnects

**Solution:** Make Match state serializable

```typescript
class Match {
  public snapshot(): MatchSnapshot {
    return {
      players: this.players.map(p => p.snapshot()),
      phase: this.phase.getCurrentPhase(),
      actionQueue: [...this.actionQueue],
    };
  }

  public restore(snapshot: MatchSnapshot): void {
    // Restore state
  }
}
```

**When to add:** When you need replay/debug features

---

### 9. **Performance Optimization**

**Current approach:** O(n²) in worst case (each effect checks all actions)

**If you have 1000+ actions:**

**A. Index actions by actor:**
```typescript
const actionsByActor = new Map<string, Action[]>();
for (const action of allActions) {
  if (!actionsByActor.has(action.actorId)) {
    actionsByActor.set(action.actorId, []);
  }
  actionsByActor.get(action.actorId)!.push(action);
}
```

**B. Use action flags instead of iteration:**
```typescript
// Instead of iterating all actions:
for (const a of allActions) {
  if (a.actorId === targetId) a.cancelled = true;
}

// Track in state:
state.cancelledActors.add(targetId);

// Effects check:
if (state.cancelledActors.has(action.actorId)) return;
```

**When to add:** When you have performance issues (unlikely for typical game sizes)

---

### 10. **Testing Infrastructure**

**Current gap:** No resolution tests yet

**Recommendations:**

```typescript
// Test helpers
function createTestMatch(playerCount: number): Match {
  const match = new Match();
  for (let i = 0; i < playerCount; i++) {
    match.addPlayer(`Player${i}`);
  }
  return match;
}

function advanceToActionPhase(match: Match): void {
  match.nextPhase(); // voting
  match.nextPhase(); // action
}

// Snapshot testing
expect(match.getPlayers().map(p => ({
  name: p.name,
  alive: p.isAlive()
}))).toMatchSnapshot();
```

**When to add:** Now! Add tests before adding more abilities

---

## Testing Strategy

### Unit Tests
- Each effect in isolation
- EffectRegistry functionality
- ResolutionContext state management
- ActionResolver sorting and execution

### Integration Tests
- Full resolution flow with multiple effects
- Edge cases and conflicts
- Phase transitions

### End-to-End Tests
- Complete game scenarios
- Multi-round games
- All abilities working together

---

## Success Criteria

**Minimum Viable Demo:**
- ✅ Players can be assigned Kill or Protect abilities
- ✅ Actions can be submitted during action phase
- ✅ Resolution correctly processes actions (with priority ordering)
- ✅ Protect blocks Kill on same target
- ⏳ Events show what happened (future: add event system)
- ⏳ Can run multiple rounds (needs testing)

**Code Quality:**
- ⏳ All tests passing (needs resolution tests)
- ✅ TypeScript strict mode clean
- ✅ Clear separation of concerns
- ✅ Easy to add new abilities (~20 lines: effect class + registration)
- ✅ Well documented (this plan!)

**Architecture Quality:**
- ✅ No circular dependencies
- ✅ Effects can see and modify other actions
- ✅ Simple, extensible ResolutionState
- ✅ Factory pattern for registry setup
- ✅ Scalable to 100+ abilities

---

## Next Steps

### Immediate (Required for Demo)
1. **Add resolution tests** (`src/test/resolution.spec.ts`)
   - Kill eliminates player
   - Protect prevents kill
   - Priority ordering works
   - Cancelled actions are skipped
   - Multiple actions on same target
2. **Create demo script** (`examples/demo.ts`)
   - Setup 3-player game
   - Assign killer + protector templates
   - Simulate action → resolution
   - Show results

### Short-term (Nice to Have)
3. **Add event system** (see Improvement #1)
   - Track what happened during resolution
   - Return events from `resolveActions()`
4. **Add more abilities** (see examples: Roleblock, Investigate)
5. **Add ability validation** (see Improvement #6)

### Medium-term (Scale Up)
6. **Private information system** (see Improvement #4)
7. **Multi-turn effects** (see Improvement #3)
8. **Passive abilities** (see Improvement #5)

---

## Summary

**What We Built:**
- Clean, scalable action resolution system
- Strategy pattern for effects
- Registry pattern for extensibility
- Effects can interact with other actions (key for social deduction!)
- Simple, non-circular architecture

**What Makes It Good:**
- Adding new ability = 1 effect class + 1 registry line
- No Match modification needed
- No Action modification needed
- Effects are isolated and testable
- Scales to complex interactions (roleblock, redirect, etc.)

**What's Next:**
- Add tests
- Add event logging
- Build demo
- Add more abilities!
