# Task 2.4 — Phase Transition Hooks

**Principle violated:** Open/Closed Principle
**Priority:** Medium (required for configurable game modes)
**Phase:** 5 (after task 2.1)

---

## Problem

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

Every new phase-triggered behavior requires a new `if` block. Future needs that are blocked by this:

- Game modes without a voting phase (pure night-action deduction)
- Multiple action phases per round
- Custom phases (betrayal, trial, defense)
- Per-phase hooks (timers, auto-skip, announcements)

---

## Proposed Solution

`PhaseManager` with `onLeave` / `onEnter` hook registries:

```typescript
type PhaseHook = (match: MatchContext) => void;

class PhaseManager {
  private onLeave = new Map<PhaseType, PhaseHook[]>();
  private onEnter = new Map<PhaseType, PhaseHook[]>();

  registerOnLeave(phase: PhaseType, hook: PhaseHook): void { ... }
  registerOnEnter(phase: PhaseType, hook: PhaseHook): void { ... }

  advance(context: MatchContext): PhaseType {
    const current = this.getCurrentPhase();
    this.onLeave.get(current)?.forEach(hook => hook(context));
    const next = this.nextPhase();
    this.onEnter.get(next)?.forEach(hook => hook(context));
    return next;
  }
}
```

During match setup, hooks replace the hardcoded `if` blocks:

```typescript
phaseManager.registerOnLeave("voting", (ctx) => ctx.tallyVotes());
phaseManager.registerOnLeave("voting", (ctx) => ctx.checkJesterWin());
phaseManager.registerOnEnter("resolution", (ctx) => ctx.resolveActions());
phaseManager.registerOnEnter("resolution", (ctx) => ctx.checkWinCondition());
```

Different game modes register different hooks. `PhaseManager` itself never changes.

---

## Acceptance Criteria

- [ ] `PhaseManager` class created with `registerOnLeave()`, `registerOnEnter()`, and `advance()`
- [ ] `MatchContext` interface defines the surface area exposed to hooks
- [ ] Default hooks registered for the classic Mafia phase order
- [ ] `advancePhase()` in `Match` delegates to `PhaseManager.advance()`
- [ ] No hardcoded `if (currentPhase === ...)` blocks remain in `Match.advancePhase()`
- [ ] `PHASE_ORDER` constant still works as the default phase sequence
- [ ] All existing tests pass

---

## Files to Create

- `src/domain/phase/PhaseManager.ts`
- `src/domain/phase/MatchContext.ts` (interface)

## Files to Modify

- `src/domain/match.ts` — remove `if` blocks from `advancePhase()`, inject `PhaseManager`
