# Task 2.3 — Make ResolutionState Extensible

**Principle violated:** Open/Closed Principle
**Priority:** High (unblocks all future effects that need shared state)
**Phase:** 3

---

## Problem

```typescript
// resolution/ResolutionState.ts
type ResolutionState = {
  protected: Set<string>;
  investigations: Map<string, string>;
};
```

Every new ability that communicates through shared state must modify this type. This becomes a dumping ground:

- Roleblock → needs `roleblocked: Set<string>`
- Redirect → needs `redirects: Map<string, string>`
- Poison → needs `poisoned: Set<string>`
- Heal → needs `healed: Set<string>`

---

## Proposed Solution

Replace the literal type with an extensible class. Two options:

**Option A — String-keyed (recommended for simplicity):**

```typescript
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

// ProtectEffect:
state.getSet("protected").add(targetId);

// KillEffect:
if (!state.getSet("protected").has(targetId)) { ... }
```

**Option B — Symbol-keyed (stronger typing):**

```typescript
const PROTECTED = Symbol("protected");

class ResolutionState {
  private slots = new Map<symbol, unknown>();

  get<T>(key: symbol, factory: () => T): T {
    if (!this.slots.has(key)) this.slots.set(key, factory());
    return this.slots.get(key) as T;
  }
}

// ProtectEffect:
const protectedSet = state.get(PROTECTED, () => new Set<string>());
protectedSet.add(targetId);
```

Either option means new effects own their state keys. `ResolutionState` itself never needs modification.

---

## Acceptance Criteria

- [ ] `ResolutionState` is a class (not a plain type) with `getSet()` / `getMap()` (or symbol-keyed `get()`)
- [ ] `ProtectEffect` migrated to use the new API
- [ ] `InvestigateEffect` migrated to use the new API
- [ ] `RoleblockEffect` uses the new API (no hardcoded field)
- [ ] State keys are exported as constants alongside their effect (e.g., `export const PROTECTED_KEY = "protected"` in `ProtectEffect.ts`)
- [ ] No existing effect directly accesses named fields on `ResolutionState`
- [ ] All existing tests pass

---

## Files to Modify

- `src/domain/resolution/ResolutionState.ts` — replace type with class
- `src/domain/effects/ProtectEffect.ts` — migrate to new API
- `src/domain/effects/KillEffect.ts` — migrate to new API
- `src/domain/effects/InvestigateEffect.ts` — migrate to new API
- `src/domain/effects/RoleblockEffect.ts` — use new API from the start
