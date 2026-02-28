# Plan: Effect-First Ability Composition & Staged Action Resolution

## Goal

Ship a scalable ability system where role identity is defined by composed effects, and queued actions are resolved automatically with deterministic staged processing.

## Scope and Principles

- Effect is identity: roles are compositions of effects (`kill`, `protect`, `roleblock`, `investigate`), not hardcoded role classes.
- Action snapshots are self-contained: resolver should not need runtime catalog lookups for ordering metadata.
- Staged resolution over flat sorting: explicit stage ordering first, then per-stage priority.
- Commit phase only mutates player state: handlers produce intents/state changes, commit applies them.
- Open extension model: modifiers/effect result types remain string-based to avoid central registries for every new mechanic.

## Step 1: Refactor Ability Entity

**File:** `src/domain/entity/ability.ts`

- Rename `EffectType` to `EffectType` with same string values.
- Add `DEFAULT_PRIORITY` by effect.
- Extend `Ability` with `priority` (default from map).
- Keep existing `validateUsage` behavior unchanged.

## Step 2: Action Snapshot for Resolution

**File:** `src/domain/entity/action.ts`

- Replace `EffectType: EffectType` with `EffectType: EffectType`.
- Add `priority: number` snapshot.
- Add `stage: ResolutionStage` snapshot.
- Keep `cancelled` flag for auditability/debugging.

## Step 3: Template Shape and Lookup

**File:** `src/domain/entity/template.ts`

- Add optional `name?: string`.
- Update `getAbility(EffectType)` to use `EffectType`.
- Keep alignment/win condition semantics unchanged.

## Step 4: Match Integration

**File:** `src/domain/entity/match.ts`

- Update `useAbility` to accept `EffectType`.
- On action queue, include `priority` and `stage` snapshot values.
- Add `resolveActions(resolver: ActionResolver): ResolutionResult`:
  - validate phase is `resolution`
  - pass actions + players (+ templates if needed)
  - clear queued actions after successful resolution
- Expand `toJSON()` to include effect-based naming and full ability config.

## Step 5: Resolution System

### 5.1 Resolution Context

**New file:** `src/domain/services/ResolutionContext.ts`

- Store per-round modifiers: `Map<playerId, Set<string>>`.
- Store pending state changes (`pending_death`, future types).
- Store effect results for response/audit.

### 5.2 Resolution Stages

**New enum:** `ResolutionStage` (in `src/domain/services/EffectHandler.ts`)

- `TARGET_MUTATION = 0`
- `DEFENSIVE = 1`
- `CANCELLATION = 2`
- `OFFENSIVE = 3`
- `READ = 4`

### 5.3 Handler Contract

**New file:** `src/domain/services/EffectHandler.ts`

- `effectType: string`
- `stage: ResolutionStage`
- `resolve(action, ctx, players, templates?)`
- Rule: handlers never mutate player lifecycle directly (`kill`, etc.).

### 5.4 Built-In Handlers

**New files under:** `src/domain/services/handlers/`

- `RoleblockHandler` (`CANCELLATION`): add `"roleblocked"` modifier.
- `ProtectHandler` (`DEFENSIVE`): add `"protected"` modifier.
- `KillHandler` (`OFFENSIVE`): if protected -> emit blocked result; else queue `pending_death`.
- `InvestigateHandler` (`READ`): return target alignment.

### 5.5 Resolver Pipeline + Commit

**New file:** `src/domain/services/ActionResolver.ts`

- Register handlers by effect type.
- Group actions by `stage`.
- Process stages in fixed order.
- Sort within stage by `priority` (desc), then deterministic tiebreaker.
- If actor has `"roleblocked"`, cancel action before handler execution.
- Commit phase applies queued state changes to real entities (e.g. `player.kill()`).

### 5.6 Result Model

**Types:** `EffectResult`, `ResolutionResult`

- `EffectResult.type` remains open string (`"kill"`, `"kill_blocked"`, etc.).
- `ResolutionResult.effects` is returned to application layer and API.

## Step 6: StartMatch Use Case

**File:** `src/application/StartMatch.ts`

- Accept full template ability config:
  - `id: EffectType`
  - optional `priority`, `canUseWhenDead`, `targetCount`, `canTargetSelf`, `requiresAliveTarget`
  - optional template `name`
- Apply defaults if optional fields are omitted.

## Step 7: AdvancePhase Auto-Resolution

**File:** `src/application/AdvancePhase.ts`

- Inject `ActionResolver`.
- After `advancePhase()`, if current phase is `resolution`, call `match.resolveActions(resolver)`.
- Return resolution results in response payload.
- Keep explicit error handling for invalid state transitions.

## Step 8: UseAbility Use Case

**File:** `src/application/UseAbility.ts`

- Replace input `EffectType` type with `EffectType`.
- Keep behavior unchanged otherwise.

## Step 9: HTTP Validation Updates

**File:** `src/infrastructure/http/validators/match.ts`

- Replace enum references to `EffectType` values.
- Expand template ability schema to include optional config fields.
- Add optional template `name`.
- Keep strict validation and descriptive errors.

## Step 10: Dependency Injection

**File:** `src/container.ts`

- Build a singleton `ActionResolver`.
- Register and wire default handlers once.
- Inject resolver into `AdvancePhaseUseCase` (and other use cases if needed).
- Avoid constructing resolver directly inside use cases.

## Step 11: Test Migration

**Primary file:** `src/__test__/end-to-end/match.e2e.spec.ts`

- Migrate tests from `EffectType` to `EffectType`.
- Update start payloads to new composed template schema.
- Add/verify:
  - roleblock cancels actor action
  - protect blocks kill
  - unprotected target dies at commit
  - investigate returns alignment
  - actions are cleared after resolution

## Delivery Strategy

### Phase A (Core Domain)

- Steps 1-5 complete with unit tests for resolver and handlers.

### Phase B (Application/API)

- Steps 6-10 complete with integration and route tests.

### Phase C (Regression Hardening)

- Step 11 complete, plus deterministic ordering and edge-case tests.

## Acceptance Criteria

- Match can start with composed roles and custom ability config.
- Actions are queued in action phase and auto-resolved when entering resolution phase.
- Resolution is deterministic and stage-correct.
- State mutation happens only in commit phase.
- API returns resolution outcomes and updated match state.
- All tests pass with migrated schema and effect naming.
