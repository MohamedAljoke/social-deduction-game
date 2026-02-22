# Task 2.2 — Pluggable Win Conditions

**Principle violated:** Open/Closed Principle
**Priority:** High (unblocks all future win condition work)
**Phase:** 2

---

## Problem

`checkWinCondition()` at `match.ts:239-266` hardcodes the hero-vs-villain counting logic. The jester win condition is bolted on separately in `checkJesterWin()`, called from a different place in `advancePhase()`.

Adding a new win condition (Serial Killer, Cult, Survivor) requires modifying `checkWinCondition()`, `getWinner()`, and `advancePhase()`.

---

## Proposed Solution

Strategy pattern mirroring the effect system.

```typescript
// domain/winConditions/IWinCondition.ts
interface IWinCondition {
  readonly id: string;
  evaluate(players: ReadonlyArray<PlayerSnapshot>): WinResult | null;
}

type WinResult = {
  winnerId: string;      // which condition triggered
  winnerLabel: string;   // "heroes", "villains", "jester", etc.
  playerIds: string[];   // which players won
  endsGame: boolean;     // does this end the match?
};
```

Concrete implementations:

- `MajorityWinCondition` — current hero/villain logic
- `VoteEliminatedWinCondition` — current jester logic

`Match` holds a `WinConditionEvaluator` that iterates registered conditions. Templates reference which win condition applies to the player. Adding a new win condition = 1 new class + registration.

---

## Acceptance Criteria

- [x] `IWinCondition` interface defined in `domain/winConditions/`
- [x] `WinResult` type defined
- [x] `MajorityWinCondition` extracts current hero/villain logic from `checkWinCondition()`
- [x] `VoteEliminatedWinCondition` extracts current jester logic from `checkJesterWin()`
- [x] `WinConditionEvaluator` iterates registered conditions and returns the first non-null result
- [x] Jester-specific state (`jesterWinners`, `endedByJesterWin`, `voteEliminatedThisRound`) moved out of `Match` and into the win condition
- [x] `checkWinCondition()` and `checkJesterWin()` removed from `Match`
- [x] `getWinner()` delegates to `WinConditionEvaluator`
- [x] All existing tests pass

---

## Files to Create

- `src/domain/winConditions/IWinCondition.ts`
- `src/domain/winConditions/MajorityWinCondition.ts`
- `src/domain/winConditions/VoteEliminatedWinCondition.ts`
- `src/domain/winConditions/WinConditionEvaluator.ts`
