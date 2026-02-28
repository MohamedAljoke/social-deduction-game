# Step 09: HTTP Validator Updates

## Goal
Expose full ability configuration safely through API validation.

## Files
- `src/infrastructure/http/validators/match.ts`

## Required Changes
- Migrate enum validation to `EffectType` values.
- Expand `TemplateAbilitySchema` with optional config fields:
  - `priority`, `canUseWhenDead`, `targetCount`, `canTargetSelf`, `requiresAliveTarget`
- Add optional `name` to template schema.
- Keep strict bounds:
  - `targetCount >= 1`
  - `priority` integer range (define project range, example `0..100`)

## Output Contract
- Invalid composition payloads are rejected before domain layer.

## Acceptance Criteria
- Minimal payload still valid.
- Invalid `targetCount`, unknown effect, and wrong field types return 400.

## Risks
- Validator and use case defaults drift.

## Mitigation
- Keep defaults centralized and import them into validator where possible.
