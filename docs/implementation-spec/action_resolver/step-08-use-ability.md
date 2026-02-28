# Step 08: UseAbility Type Migration

## Goal

Align ability execution API with effect-first naming.

## Files

- `src/application/UseAbility.ts`

## Required Changes

- Replace input `EffectType` type with `EffectType`.
- Keep persistence and error handling behavior unchanged.

## Output Contract

- Application layer no longer depends on old `EffectType` symbol.

## Acceptance Criteria

- All callers compile with `EffectType`.
- Runtime behavior of ability queueing unchanged.

## Risks

- Partial migration leaves mixed type usage.

## Mitigation

- Add repo-wide grep check to remove `EffectType` references.
