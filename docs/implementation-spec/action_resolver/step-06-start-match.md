# Step 06: StartMatch Use Case Expansion

## Goal
Allow API clients to compose roles with full ability config.

## Files
- `src/application/StartMatch.ts`

## Required Changes
- Expand input template schema:
  - `name?: string`
  - `alignment`
  - `abilities[]` with:
    - `id: EffectType`
    - `priority?`
    - `canUseWhenDead?`
    - `targetCount?`
    - `canTargetSelf?`
    - `requiresAliveTarget?`
- Apply defaults in use case when optional fields omitted.
- Construct `Template` and `Ability` with resolved config.

## Output Contract
- Custom ability configs are persisted in match templates.

## Acceptance Criteria
- Existing minimal payload (`id` only) still works.
- Custom `priority` and targeting options are reflected in match state.

## Risks
- Invalid config combinations (example: `targetCount = 0`).

## Mitigation
- Enforce strong validation in Step 09 and domain guards where needed.
