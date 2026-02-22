# Task Index — Critical Issues

Tasks derived from `docs/ARCHITECTURE_REVIEW.md § 2. Critical Issues`.

## Phase 1 — Quick Wins (no architecture change)

| Task | Title | Status |
|---|---|---|
| [2.11](task-2.11-fix-ensure-phase-error.md) | Fix `ensurePhase()` error message bug | completed |
| [2.8](task-2.8-derive-zod-schemas-from-ability-enum.md) | Derive Zod schemas from `AbilityId` enum | completed |
| [2.6](task-2.6-remove-duplicate-match-status.md) | Remove duplicate `MatchStatus` type | completed |
| [2.7](task-2.7-fix-template-assignment.md) | Fix silent template assignment | completed |

## Phase 2 — Pluggable Win Conditions

| Task | Title | Status |
|---|---|---|
| [2.2](task-2.2-pluggable-win-conditions.md) | Pluggable win conditions (Strategy pattern) | completed |

## Phase 3 — Extensible ResolutionState

| Task | Title | Status |
|---|---|---|
| [2.3](task-2.3-extensible-resolution-state.md) | Make `ResolutionState` extensible | completed |

## Phase 4 — Extract Match Responsibilities

| Task | Title | Status |
|---|---|---|
| [2.1](task-2.1-extract-match-responsibilities.md) | Extract Match responsibilities (God Object) | completed |
| [2.5](task-2.5-move-repository-interfaces.md) | Move repository interfaces to domain layer | completed |
| [2.9](task-2.9-target-validation.md) | Add target validation to `submitAction` | completed |
| [2.10](task-2.10-wire-resolution-events.md) | Wire `ResolutionEvent` into the pipeline | completed |

## Phase 5 — Configurable Game Modes

| Task | Title | Status |
|---|---|---|
| [2.4](task-2.4-phase-transition-hooks.md) | Phase transition hooks (`PhaseManager`) | completed |

---

## Dependency Order

```
2.11 → (independent)
2.8  → (independent)
2.6  → (independent)
2.7  → (independent)
2.2  → (independent, but should precede 2.1)
2.3  → (independent, but should precede 2.1)
2.1  → requires 2.2 + 2.3 complete
2.5  → (independent)
2.9  → (independent)
2.10 → (independent, benefits from 2.3)
2.4  → requires 2.1 complete
```
