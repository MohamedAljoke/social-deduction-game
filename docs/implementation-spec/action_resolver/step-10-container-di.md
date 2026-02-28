# Step 10: DI Container Wiring

## Goal
Construct and share resolver infrastructure through container.

## Files
- `src/container.ts`

## Required Changes
- Register `ActionResolver` as singleton.
- Register built-in handlers once and attach to resolver.
- Inject resolver into `AdvancePhaseUseCase`.
- Avoid `new ActionResolver()` / `new ResolutionEngine()` inside use cases.

## Output Contract
- Resolver behavior is consistent across routes and use cases.

## Acceptance Criteria
- All relevant use cases resolve dependencies via container.
- No duplicated resolver construction remains.

## Risks
- Circular dependency introduction when adding new services.

## Mitigation
- Keep resolver factory isolated and stateless beyond handler map.
