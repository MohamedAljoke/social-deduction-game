# Project Structure Guide

## Objective

This project is a transport-agnostic social deduction engine. The structure below is optimized for:
- 100+ abilities
- deterministic resolution
- composable ability interactions
- clean architecture boundaries

## Core Layer Boundaries

- `domain`: pure game rules, no HTTP/WebSocket/framework code.
- `application`: use-case orchestration.
- `infrastructure`: adapters (HTTP, persistence, future WebSocket).

Dependency rule:
- `domain` depends on nothing external.
- `application` depends on `domain`.
- `infrastructure` depends on `application` + `domain` ports.

## Recommended Structure (Scalable)

```text
src/
  domain/
    entity/
      match.ts
      player.ts
      phase.ts
      template.ts
      action.ts
    abilities/
      AbilityCatalog.ts
      AbilityDefinition.ts
      definitions/
        kill.ts
        protect.ts
        roleblock.ts
        investigate.ts
    resolution/
      ResolutionEngine.ts
      ResolutionPipeline.ts
      ResolutionState.ts
      ResolutionResult.ts
      hooks.ts
      handlers/
        killHandler.ts
        protectHandler.ts
        roleblockHandler.ts
        investigateHandler.ts
    services/
      CheckWinConditions.ts
    ports/
      persistance/
        MatchRepository.ts
    errors.ts

  application/
    CreateMatch.ts
    JoinMatch.ts
    StartMatch.ts
    UseAbility.ts
    AdvancePhase.ts
    ResolveActions.ts
    GetMatch.ts
    ListMatchs.ts

  infrastructure/
    http/
      routes/
      validators/
      middlewares/
      hono_adapter.ts
      express_adapter.ts
    persistence/
      InMemoryMatchRepository.ts
```

## Responsibility Split

### `domain/entity/*`
- Aggregates and entities only.
- Keep `Match` focused on lifecycle and action queue ownership.
- Avoid placing cross-ability interaction logic here.

### `domain/abilities/*`
- Ability metadata (target count, self-target rules, phases, tags, priority).
- Definitions are data-first and map to resolver handlers.

### `domain/resolution/*`
- All effect combination complexity.
- Deterministic ordering and conflict handling.
- Hook system (`beforeAction`, `beforeApply`, `afterApply`, `onDeath`, `endOfRound`).
- Produces `ResolutionResult` (state changes + events).

### `domain/services/*`
- Pure domain services that are not entity methods.
- Example: win condition evaluation.

### `application/*`
- Fetch aggregate from repository.
- Call domain operations/services.
- Persist and return DTOs.
- No transport-specific logic.

### `infrastructure/*`
- Request validation, route handling, serialization, repository adapters.
- No business rules beyond data parsing/translation.

## Action and Resolution Data Flow

1. `UseAbilityUseCase` calls `match.useAbility(...)`.
2. `Match` validates ownership/targets and queues `Action`.
3. `ResolveActionsUseCase` calls `ResolutionEngine.resolve(matchSnapshot)`.
4. Engine returns `ResolutionResult` with deterministic events and transitions.
5. Use case commits transitions to `Match`, clears round actions, checks win condition.

## Design Rules for 100 Abilities

1. New ability should not require edits in `Match`.
2. New ability should not require custom branching in `ResolveActionsUseCase`.
3. Ability behavior should be added via catalog + handler.
4. Interactions should use hooks/state tags, not one-off pairwise if/else chains.
5. Every resolution outcome should emit an event.

## Testing Layout

```text
src/__test__/
  domain/
    abilities/
      contracts/
    resolution/
      interactions/
      determinism/
  application/
    resolve-actions.spec.ts
  end-to-end/
    match.e2e.spec.ts
  fitness-functions/
    architecture-fitness.spec.ts
```

- Contract tests: one reusable suite per ability definition.
- Interaction tests: high-risk combinations (pair/triple).
- Determinism tests: same input -> same ordered events.
- Fitness tests: preserve clean architecture boundaries.

## Notes

- Keep current uncommitted resolver/effects work as the base.
- Refactor incrementally into `domain/resolution` and `domain/abilities`.
- Prioritize deterministic outputs and test coverage before adding many abilities.
