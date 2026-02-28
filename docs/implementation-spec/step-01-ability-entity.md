# Step 01: Refactor Ability Entity

## Goal
Make ability identity effect-first and resolution-aware.

## Files
- `src/domain/entity/ability.ts`

## Required Changes
- Rename enum `AbilityId` to `EffectType`.
- Keep values unchanged: `kill`, `protect`, `roleblock`, `investigate`.
- Add `DEFAULT_PRIORITY: Record<EffectType, number>`.
- Extend `Ability` constructor with `priority` defaulting from `DEFAULT_PRIORITY`.
- Keep `validateUsage` logic unchanged.

## Output Contract
- `Ability.id` type is `EffectType`.
- `Ability.priority` exists and is always set.

## Acceptance Criteria
- No runtime behavior regressions in existing target validation.
- All imports referencing `AbilityId` compile after migration.

## Risks
- Widespread type breakage from rename.
- Hidden string comparisons against old symbol names.

## Mitigation
- Apply rename with compiler guidance.
- Add temporary compatibility alias only if migration is blocked.
