# Task 2.11 — Fix ensurePhase() Error Message Bug

**Priority:** High (bug — misleading error messages in production)
**Phase:** 1

---

## Problem

`match.ts:120-125`:

```typescript
private ensurePhase(expected: PhaseType) {
  const current = this.getCurrentPhase();
  if (current !== expected) {
    throw new WrongPhaseError("action", this.getCurrentPhase());
    //                         ^^^^^^^^ always says "action" regardless of expected
  }
}
```

The first argument to `WrongPhaseError` is always the literal string `"action"` instead of the `expected` parameter. When called from `submitVote()` (which expects `"voting"`), the error message says the expected phase was `"action"`, which is incorrect and misleading.

---

## Fix

One-line change:

```typescript
throw new WrongPhaseError(expected, this.getCurrentPhase());
```

---

## Acceptance Criteria

- [ ] `WrongPhaseError` is thrown with `expected` as the first argument (not the literal `"action"`)
- [ ] Test: calling `submitVote()` during the action phase produces a `WrongPhaseError` with `expected = "voting"`
- [ ] Test: calling `submitAction()` during the voting phase produces a `WrongPhaseError` with `expected = "action"`
- [ ] All existing tests pass

---

## Files to Modify

- `src/domain/match.ts:123` — replace `"action"` with `expected`
