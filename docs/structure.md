# Project Structure Guide

## Overview

This is a general-purpose social deduction engine with composable role abilities and a staged action resolution pipeline.

## Source Tree

```text
src/
├── app.ts
├── main.ts
├── container.ts
├── application/
│   ├── AdvancePhase.ts
│   ├── CreateMatch.ts
│   ├── GetMatch.ts
│   ├── JoinMatch.ts
│   ├── ListMatchs.ts
│   ├── StartMatch.ts
│   └── UseAbility.ts
├── domain/
│   ├── entity/
│   │   ├── ability.ts
│   │   ├── action.ts
│   │   ├── match.ts
│   │   ├── phase.ts
│   │   ├── player.ts
│   │   └── template.ts
│   ├── services/
│   │   ├── ActionResolver.ts
│   │   ├── EffectHandler.ts
│   │   ├── ResolutionContext.ts
│   │   └── handlers/
│   │       ├── InvestigateHandler.ts
│   │       ├── KillHandler.ts
│   │       ├── ProtectHandler.ts
│   │       └── RoleblockHandler.ts
│   ├── ports/
│   │   └── persistance/
│   │       ├── MatchRepository.ts
│   │       └── TemplateRepository.ts
│   └── errors.ts
├── infrastructure/
│   ├── http/
│   │   ├── express_adapter.ts
│   │   ├── hono_adapter.ts
│   │   ├── middlewares/
│   │   │   └── validator.ts
│   │   ├── routes/
│   │   │   ├── match.ts
│   │   │   └── route.ts
│   │   ├── server.ts
│   │   └── validators/
│   │       ├── index.ts
│   │       └── match.ts
│   └── persistence/
│       ├── InMemoryMatchRepository.ts
│       └── InMemoryTemplateRepository.ts
└── __test__/
    ├── domain/
    ├── end-to-end/
    └── fitness-functions/
```

## Layer Responsibilities

- `src/domain`: core game rules, entities, resolver pipeline, ports, and domain errors.
- `src/application`: use cases that coordinate domain objects and repositories.
- `src/infrastructure`: HTTP adapters, request validation, route wiring, and in-memory adapters.
- `src/container.ts`: dependency injection/composition root.

## Key Domain Types

### Ability (`src/domain/entity/ability.ts`)

- `EffectType`: `kill | protect | roleblock | investigate`
- `DEFAULT_PRIORITY`: built-in priority map per effect type.
- `Ability` fields:
  - `id`
  - `priority`
  - `canUseWhenDead`
  - `targetCount`
  - `canTargetSelf`
  - `requiresAliveTarget`

### Action (`src/domain/entity/action.ts`)

- Snapshot data captured when ability is used:
  - `actorId`
  - `effectType`
  - `priority`
  - `stage`
  - `targetIds`
  - `cancelled`

### Template (`src/domain/entity/template.ts`)

- `name?` is optional.
- `getAbility(effectType)` returns matching ability config.

### Match (`src/domain/entity/match.ts`)

- Validates and queues ability usage in action phase.
- Resolves queue only in `resolution` phase through `resolveActions(resolver)`.
- Clears action queue after resolution.
- Serializes full template ability config in `toJSON()`.

## Resolution Subsystem

Implemented under `src/domain/services/`:

- `EffectHandler.ts`: handler contract + `ResolutionStage`.
- `ResolutionContext.ts`: per-round modifiers, state changes, and effect results.
- `ActionResolver.ts`: stage grouping, priority sorting, roleblock cancellation, commit phase.
- `handlers/*`: built-in effects (`kill`, `protect`, `roleblock`, `investigate`).

Execution path:

1. `UseAbilityUseCase` queues actions.
2. `AdvancePhaseUseCase` advances phase.
3. If next phase is `resolution`, `ActionResolver` runs and returns `resolution.effects`.

## HTTP Contracts (current)

### `POST /match/:matchId/start`

- Body:
  - `templates[].name?`
  - `templates[].alignment`
  - `templates[].abilities[].id`
  - optional ability config: `priority`, `canUseWhenDead`, `targetCount`, `canTargetSelf`, `requiresAliveTarget`

### `POST /match/:matchId/ability`

- Body:
  - `actorId`
  - `effectType`
  - `targetIds`

### `POST /match/:matchId/phase`

- Returns regular match payload.
- Includes `resolution` only when phase advanced into `resolution`.

## Tests

- Domain resolver behavior: `src/__test__/domain/action-resolver.spec.ts`
- End-to-end flow: `src/__test__/end-to-end/match.e2e.spec.ts`
- Architecture guardrail: `src/__test__/fitness-functions/architecture-fitness.spec.ts`
