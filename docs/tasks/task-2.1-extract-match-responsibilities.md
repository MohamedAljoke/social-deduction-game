# Task 2.1 — Extract Match Responsibilities (God Object)

**Principle violated:** Single Responsibility Principle
**Priority:** High (blocks all future feature work)
**Phase:** 4 (do after tasks 2.2 and 2.3)

---

## Problem

`Match` (312 lines) handles seven distinct responsibilities:

| Responsibility | Methods |
|---|---|
| Player management | `addPlayer`, `getPlayers`, `getPlayerByID`, `eliminatePlayer` |
| Phase management | `advancePhase`, `nextPhase`, `getCurrentPhase`, `ensurePhase` |
| Action orchestration | `submitAction`, `resolveActions` |
| Vote orchestration | `submitVote`, `tallyVotes` |
| Win condition evaluation | `checkWinCondition`, `getWinner` |
| Jester win condition | `checkJesterWin`, `getJesterWinners` |
| Investigation result storage | `getInvestigationResult` |

At 20 abilities and 5 win conditions, `Match` will be 800+ lines with interleaved concerns. Every new feature requires modifying `Match` directly — the opposite of Open/Closed.

---

## Proposed Solution

Extract focused collaborator classes, each injected into `Match`:

```
Match (orchestrator / aggregate root)
  ├── PlayerRoster          → player management
  ├── PhaseManager          → phase state machine + transition hooks
  ├── ActionResolver        → resolution pipeline (resolveActions + effectRegistry + actionQueue)
  ├── VoteTallier           → vote counting logic (tallyVotes + voteQueue)
  └── WinConditionEvaluator → pluggable win condition checks
```

`Match` retains its role as the single entry point for all game mutations — it delegates but does not disappear.

---

## Acceptance Criteria

- [ ] `ActionResolver` owns `resolveActions()`, `effectRegistry`, and `actionQueue`
- [ ] `VoteTallier` owns `tallyVotes()` and `voteQueue`
- [ ] `PlayerRoster` owns `addPlayer`, `getPlayers`, `getPlayerByID`, `eliminatePlayer`
- [ ] `PhaseManager` owns phase state + transition (see task 2.4)
- [ ] `Match` delegates to these components; its public API is unchanged
- [ ] All existing tests pass after extraction
- [ ] No new responsibilities added to `Match`

---

## Dependencies

- Task 2.2 (win condition extraction) should be done first so `WinConditionEvaluator` has a clean interface
- Task 2.3 (extensible `ResolutionState`) should be done first so `ActionResolver` doesn't inherit a fragile type
