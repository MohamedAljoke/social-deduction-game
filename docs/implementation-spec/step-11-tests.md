# Step 11: Test Plan and Migration

## Goal

Verify migration correctness and prevent ordering regressions.

## Files

- `src/__test__/end-to-end/match.e2e.spec.ts`
- `src/__test__/domain/...` (new/updated resolver tests)
- `src/__test__/application/...` (phase/use-case integration tests)

## Required Changes

- Replace `EffectType` references with `EffectType`.
- Update start payload fixtures to include new template schema.
- Add or update tests for:
  - roleblock cancels actor action
  - protect blocks kill
  - kill on unprotected target sets DEAD after commit
  - investigate returns alignment data
  - actions are cleared after resolution
  - resolution auto-runs when advancing to `resolution`

## Acceptance Criteria

- Deterministic ordering test for same-stage same-priority actions.
- No dependence on manual `/resolve` call in normal flow.
- Full suite passes.

## Risks

- Flaky tests from random template assignment.

## Mitigation

- Seed randomness or pin template assignment in test setup.
