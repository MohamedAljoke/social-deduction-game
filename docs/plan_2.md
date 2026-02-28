# Ability Engine Plan (Scalable to 100+ Abilities)

## Goal

Build a deterministic, extensible game engine where adding a new ability usually means:
1. Add metadata to an ability catalog.
2. Add one effect handler (or reuse existing primitives).
3. Add contract tests for that ability.

No core resolver rewrites for each new ability.

## Current Snapshot (from uncommitted work)

You already have a good start:
- `ResolveActionsUseCase` exists.
- Effects are split (`KillEffect`, `ProtectEffect`, `RoleblockEffect`, `InvestigateEffect`).
- `ActionResolver` has a registry and priority ordering.
- `Match` can now clear actions and be marked finished.

Main scaling gaps:
- Registry uses `instanceof` mapping (not plugin-friendly).
- Resolution state is too narrow for complex interactions.
- Effects mutate match directly during iteration.
- No stable interaction hooks (before/after target, before/after resolve, on death, end round).
- No test matrix for cross-ability combinations.

## Target Engine Model

### 1) Ability Catalog (data-first)

Define each ability by metadata + behavior id:
- `id`, `timingWindow`, `priority`, `targetingRules`, `tags`.
- `handlerId` points to a resolver handler.

This allows 100+ ability definitions without 100 deep core changes.

### 2) Resolution Pipeline (staged)

Process each round in deterministic stages:
1. Intake: collect valid actions from `Match`.
2. Normalize: create immutable `ActionIntent` entries.
3. Order: sort by `timingWindow`, `priority`, deterministic tie-breakers.
4. Resolve: execute handlers against `ResolutionState`.
5. Commit: apply resulting state transitions to `Match`.
6. Emit: publish `ResolutionEvent[]` for clients/logs/replay.

### 3) Rich ResolutionState

Use a central state model for interactions:
- Statuses (blocked, protected, silenced, redirected, immune, marked, etc.).
- Durations (`this_round`, `next_round`, `permanent`).
- Per-player flags and counters.
- Round-local scratch data for chain effects.

### 4) Interaction Hooks

Support combination logic through hooks, not pairwise hardcoding:
- `beforeAction`
- `beforeTarget`
- `beforeApply`
- `afterApply`
- `onDeath`
- `endOfRound`

Abilities/modifiers subscribe to hooks. This keeps interactions composable.

### 5) Event-Driven Outcomes

Every outcome should produce an event:
- `player_killed`, `player_protected`, `player_blocked`, `ability_failed`, etc.

Events become the source for:
- UI updates
- audit/replay
- deterministic tests

## Recommended Domain Changes

- Keep `Match` as orchestration aggregate (players, phase, queued actions, lifecycle).
- Move interaction complexity into `domain/resolution/*`.
- Keep `UseAbility` validation in domain, but make it read from ability catalog rules.
- Keep `CheckWinConditions` pure and separate.

## Suggested Folder Target

```text
src/domain/
  abilities/
    AbilityCatalog.ts
    definitions/
      kill.ts
      protect.ts
      roleblock.ts
  resolution/
    ActionIntent.ts
    ResolutionEngine.ts
    ResolutionPipeline.ts
    ResolutionState.ts
    hooks.ts
    handlers/
      killHandler.ts
      protectHandler.ts
      roleblockHandler.ts
  services/
    CheckWinConditions.ts
```

## Determinism Rules (must-have)

When two actions conflict, use fixed ordering:
1. timing window
2. priority
3. actor id (or action id) as final tie-breaker

Never rely on insertion order or random iteration.

## Testing Strategy for 100+ Abilities

### 1) Ability Contract Tests

Each ability gets a shared suite:
- target validation
- alive/dead constraints
- expected events
- expected state transitions

### 2) Interaction Matrix Tests

Add focused pair/triple interaction tests for critical combos:
- protect vs kill
- roleblock vs protect
- redirect vs investigate
- immunity vs kill

### 3) Deterministic Snapshot Tests

Given same match state + action list, engine output must match snapshot exactly.

## Migration Plan (from your current code)

### Phase A: Stabilize Current Resolver
- Replace `instanceof` mapping with explicit `effect.abilityId`.
- Return `ResolutionResult { events, stateChanges }` instead of only side effects.
- Add tests for current 4 abilities.

### Phase B: Introduce Pipeline + State
- Add `ResolutionState` modules and hook points.
- Stop direct mutation inside handlers where possible; commit in one place.

### Phase C: Catalog-Driven Abilities
- Add `AbilityCatalog` and move validation metadata there.
- Keep enum ids for now, then migrate to extensible string ids if needed.

### Phase D: Expand Abilities Safely
- Add abilities by handler + catalog entry + contract tests.
- Track complexity by tags and hooks, not custom branches in `Match`.

## Immediate Next Implementation Steps

1. Refactor `ActionResolver` registration API (`abilityId` on each effect).
2. Introduce `ResolutionResult` and central commit function.
3. Add test file for `ResolveActionsUseCase` and resolver interactions.
4. Add docs for ability definition schema (metadata + handler).
