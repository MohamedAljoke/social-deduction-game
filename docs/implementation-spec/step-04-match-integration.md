# Step 04: Match Integration

## Goal
Move resolution orchestration into match aggregate and serialize full config.

## Files
- `src/domain/entity/match.ts`

## Required Changes
- Change `useAbility` input to `EffectType`.
- During action queue, snapshot ability `priority` and `stage`.
- Add `resolveActions(resolver: ActionResolver): ResolutionResult`:
  - require current phase `resolution`
  - pass actions and player context to resolver
  - clear actions after resolve
- Update `toJSON()`:
  - include effect field naming
  - include ability full config (`priority`, targeting flags)
  - include template `name` if present

## Output Contract
- Match is the single entry point for action resolution.

## Acceptance Criteria
- Resolving in non-resolution phase throws domain error.
- Actions are empty after successful resolve.

## Risks
- Duplication with existing resolve use case.

## Mitigation
- Keep use case thin and delegate core behavior to match entity.
