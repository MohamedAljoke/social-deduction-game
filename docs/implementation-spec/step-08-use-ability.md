# Step 08: UseAbility Type Migration

## Goal
Align ability execution API with effect-first naming.

## Files
- `src/application/UseAbility.ts`

## Required Changes
- Replace input `abilityId` type with `EffectType`.
- Keep persistence and error handling behavior unchanged.

## Output Contract
- Application layer no longer depends on old `AbilityId` symbol.

## Acceptance Criteria
- All callers compile with `EffectType`.
- Runtime behavior of ability queueing unchanged.

## Risks
- Partial migration leaves mixed type usage.

## Mitigation
- Add repo-wide grep check to remove `AbilityId` references.
