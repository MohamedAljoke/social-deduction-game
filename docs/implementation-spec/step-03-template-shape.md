# Step 03: Template Shape and Lookup

## Goal
Allow human-readable template names and effect-based ability lookup.

## Files
- `src/domain/entity/template.ts`

## Required Changes
- Add optional `name?: string` to template constructor and JSON output.
- Change `getAbility(abilityId)` to use `EffectType`.
- Update related imports.

## Output Contract
- Templates can be identified by both `id` and optional display `name`.

## Acceptance Criteria
- Existing flows still work when `name` is omitted.
- Ability lookup uses `EffectType` end-to-end.

## Risks
- Serialization mismatches in HTTP response snapshots.

## Mitigation
- Update tests or snapshots where response shape is asserted.
