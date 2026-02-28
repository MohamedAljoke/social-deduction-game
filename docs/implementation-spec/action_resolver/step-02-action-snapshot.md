# Step 02: Action Snapshot for Resolution

## Goal

Queue actions with all ordering metadata needed by resolver.

## Files

- `src/domain/entity/action.ts`

## Required Changes

- Replace `EffectType: EffectType` with `EffectType: EffectType`.
- Add `priority: number`.
- Add `stage: ResolutionStage`.
- Keep `cancelled` field.

## Output Contract

- Resolver can sort and stage actions without catalog lookups.

## Acceptance Criteria

- Every created action includes `priority` and `stage`.
- No runtime need to resolve definition metadata from ability catalog.

## Risks

- Action construction call sites fail after signature change.

## Mitigation

- Update all `new Action(...)` call sites in same PR.
