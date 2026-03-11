# Plan: Add `vote_shield` Ability

## Goal

Add a new ability, `vote_shield`, that can be used during the action phase to protect one player from elimination in the next voting phase only. The shield is consumed the first time it prevents a vote elimination.

This document is implementation-ready but intentionally stops at planning. No code changes beyond this plan should be made from it directly without executing the work in a separate step.

## Read-Back From Current Architecture

### Project context

- The backend is the authoritative game engine for match state and phase transitions.
- The frontend reflects server state and exposes ability selection and template configuration.
- Matches are currently stored in-memory via `InMemoryMatchRepository`, but the aggregate response shape is still important because tests and clients depend on `match.toJSON()`.

### Domain analysis

Keeping `.claude/skills/domain-analysis/SKILL.md` in mind, this feature belongs inside the existing game orchestration bounded context, not as a new context:

- **Core domain**: match flow and game rules
  - `Match`, phase progression, vote resolution, action resolution
- **Supporting domain**: ability resolution pipeline
  - `ActionResolver`, handlers, action factory
- **Generic/supporting UI concerns**: template builder labels, client ability metadata, tests

The important boundary is:

- `VoteShieldHandler` decides that a shield effect was created during action resolution.
- `Match` decides whether that persisted effect changes voting elimination.

That keeps rule ownership coherent: action handlers produce domain effects; the `Match` aggregate enforces cross-phase match rules.

## Verified Constraints In The Codebase

- `ResolutionContext` modifiers are ephemeral and only live for one `ActionResolver.resolve()` call.
- Vote elimination happens in [`backend/src/domain/entity/match.ts`](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts) during `advancePhase()` when the current phase is voting.
- Action resolution currently returns only `effects`; it does not return any persisted cross-phase state.
- `ActionResolverFactory` explicitly registers each handler, so a new handler must be wired there.
- Ability IDs are validated from `EffectType` in backend HTTP validation, so backend enums drive API acceptance.
- Frontend ability availability and labels are maintained in separate lookup tables, so adding the ability in one place is not sufficient.
- Current repository storage is in-memory object storage, so persistence across process restarts is not required now, but aggregate serialization still matters for correctness and test coverage.

## Recommended Design

### 1. Persist vote-shield state in `Match`

Store the pending shield on the `Match` aggregate, not in `ResolutionContext`.

Recommended shape:

- `private voteShieldedPlayerIds: Set<string>`

Why:

- The effect must survive phase changes.
- Vote elimination is already enforced by `Match.advancePhase()`.
- This aligns the state with the rule it influences.

### 2. Extend action resolution with persisted side effects

`ActionResolver.resolve()` should return both:

- user-visible effects for the event stream
- persisted state outputs that the aggregate can apply after resolution

Recommended contract addition:

- `voteShieldedPlayerIds: string[]`

This is the narrowest change that fits the existing architecture without moving voting logic into handlers.

### 3. Introduce a dedicated `VoteShieldHandler`

Add a new handler in the defensive stage.

Responsibilities:

- emit a state change or equivalent signal representing shield creation for each target
- emit a visible effect result with type `vote_shield`

Non-responsibilities:

- it should not directly mutate `Match`
- it should not decide voting elimination

### 4. Consume shield during voting elimination only

When the voting round resolves an `eliminatedPlayerId`, `Match.advancePhase()` should:

1. check whether that player is currently shielded
2. if shielded, skip elimination and consume the shield
3. if not shielded, eliminate normally

The shield should only block vote elimination, not kills or any other future elimination path.

## Implementation Workstreams

### Workstream 1: Extend backend ability model

Files:

- [`backend/src/domain/entity/ability.ts`](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/ability.ts)
- [`backend/src/domain/entity/action.ts`](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/action.ts)

Tasks:

- Add `EffectType.VoteShield = "vote_shield"`.
- Add a default priority consistent with defensive abilities.
- Add `vote_shield` to `DEFAULT_STAGE_BY_EFFECT` as `ResolutionStage.DEFENSIVE`.

Acceptance criteria:

- Backend can parse and construct a `vote_shield` ability.
- `AbilityActionFactory` can derive stage and priority without special cases.

### Workstream 2: Add resolution support for shield generation

Files:

- New: [`backend/src/domain/services/resolution/handlers/VoteShieldHandler.ts`](/home/mohamed/project/social-deduction-game/backend/src/domain/services/resolution/handlers/VoteShieldHandler.ts)
- [`backend/src/domain/services/resolution/ActionResolver.ts`](/home/mohamed/project/social-deduction-game/backend/src/domain/services/resolution/ActionResolver.ts)
- [`backend/src/domain/services/resolution/ResolutionContext.ts`](/home/mohamed/project/social-deduction-game/backend/src/domain/services/resolution/ResolutionContext.ts)
- [`backend/src/domain/services/resolution/ActionResolverFactory.ts`](/home/mohamed/project/social-deduction-game/backend/src/domain/services/resolution/ActionResolverFactory.ts)

Tasks:

- Add a typed way for resolution to represent a vote-shield state change.
- Implement `VoteShieldHandler` to register shielded targets and emit a `vote_shield` effect result.
- Extend `ResolutionResult` to include persisted shield targets.
- Update `ActionResolver.resolve()` to collect shield state changes into that result.
- Register the handler in `ActionResolverFactory`.

Implementation note:

- Prefer tightening `StateChange["type"]` to a discriminated union if practical instead of leaving it as an unbounded string. This reduces regression risk when adding future cross-phase effects.

Acceptance criteria:

- Resolving actions containing `vote_shield` returns `effects` plus shield targets to persist.
- Existing handlers for `kill`, `protect`, `roleblock`, and `investigate` behave unchanged.

### Workstream 3: Persist and consume shields in the `Match` aggregate

Files:

- [`backend/src/domain/entity/match.ts`](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts)
- [`backend/src/domain/services/match/MatchSnapshotMapper.ts`](/home/mohamed/project/social-deduction-game/backend/src/domain/services/match/MatchSnapshotMapper.ts)

Tasks:

- Add `voteShieldedPlayerIds` to `Match` state and constructor props.
- In `resolveActions()`, merge the resolver output into that set after action resolution succeeds.
- In `advancePhase()`, intercept vote elimination if the eliminated player is shielded.
- Consume the shield when it prevents elimination.
- Decide whether `voteShieldedPlayerIds` should be exposed in `toJSON()`.

Recommendation on serialization:

- Do **not** expose `voteShieldedPlayerIds` to the client unless there is a UI requirement to display it.
- Do add it to constructor props so domain tests can instantiate the aggregate with persisted shield state.
- If later persistence becomes snapshot-based instead of in-memory object storage, include it in the persistence mapper at that time.

Acceptance criteria:

- A shield applied in action phase survives into the next voting phase.
- That shield blocks exactly one vote elimination.
- Shielded players can still die from non-vote effects.
- The match winner logic still runs only when an actual elimination changes player state.

### Workstream 4: Wire the new ability through backend APIs

Files:

- [`backend/src/infrastructure/http/validators/match.ts`](/home/mohamed/project/social-deduction-game/backend/src/infrastructure/http/validators/match.ts)
- Any backend code that depends on `EffectType` enums

Tasks:

- Ensure request validation accepts `vote_shield` everywhere `EffectType` is used.
- Verify template creation and ability-use endpoints accept the new value without extra schema changes.

Acceptance criteria:

- Starting a match with a `vote_shield` template succeeds.
- Submitting `vote_shield` through the use-ability endpoint succeeds.

### Workstream 5: Wire the new ability through the client

Files:

- [`client/src/features/lobby/TemplateBuilder/TemplateBuilderScreen.tsx`](/home/mohamed/project/social-deduction-game/client/src/features/lobby/TemplateBuilder/TemplateBuilderScreen.tsx)
- [`client/src/features/game/hooks/useAvailableAbilities.ts`](/home/mohamed/project/social-deduction-game/client/src/features/game/hooks/useAvailableAbilities.ts)
- [`client/src/features/game/hooks/useGamePlayer.ts`](/home/mohamed/project/social-deduction-game/client/src/features/game/hooks/useGamePlayer.ts)
- Any client type aliases or tests that enumerate supported abilities

Tasks:

- Add `vote_shield` to the template builder ability list.
- Add client metadata:
  - `targetCount: 1`
  - `canUseWhenDead: false`
  - `canTargetSelf: true`
  - `requiresAliveTarget: true`
- Add label text so action buttons and game log entries render correctly.
- Extend e2e helper types that currently enumerate ability IDs.

Acceptance criteria:

- Hosts can configure templates with `Vote Shield`.
- Eligible players can select the ability during action phase.
- Existing action logs and button labels do not degrade to raw IDs.

### Workstream 6: Add tests before considering the feature complete

Backend tests:

- [`backend/src/__test__/domain/match-collaborators.spec.ts`](/home/mohamed/project/social-deduction-game/backend/src/__test__/domain/match-collaborators.spec.ts)
- [`backend/src/__test__/end-to-end/match.e2e.spec.ts`](/home/mohamed/project/social-deduction-game/backend/src/__test__/end-to-end/match.e2e.spec.ts)

Client tests:

- [`client/src/test/units/features/game/useAvailableAbilities.test.tsx`](/home/mohamed/project/social-deduction-game/client/src/test/units/features/game/useAvailableAbilities.test.tsx)
- [`client/src/test/e2e/abilities.spec.ts`](/home/mohamed/project/social-deduction-game/client/src/test/e2e/abilities.spec.ts)
- [`client/src/test/e2e/helpers.ts`](/home/mohamed/project/social-deduction-game/client/src/test/e2e/helpers.ts)

Required scenarios:

- Backend domain:
  - `vote_shield` resolves as a defensive effect and returns persisted shield targets.
  - `Match.resolveActions()` stores shield state.
  - voting elimination is skipped when the target is shielded.
  - shield is consumed after preventing elimination once.
  - a shield does not block kill resolution.
- Backend e2e:
  - start a match with a `vote_shield` template
  - use shield in action phase
  - next voting phase targets the shielded player and elimination is prevented
  - following voting phase eliminates that same player normally
- Client unit:
  - `vote_shield` is available when the actor is alive and has any alive target including self
  - it is unavailable after use in the same phase
- Client e2e:
  - template builder can assign `Vote Shield`
  - action UI shows the ability button
  - the protected player survives the next vote and can be eliminated on a later vote

## Risks To Address During Implementation

### 1. State shape drift

The current draft plan assumed only `Match` needed updating. In practice, `EffectType`, `DEFAULT_STAGE_BY_EFFECT`, frontend metadata, validators, helper union types, and tests all enumerate abilities separately. Missing any of these will cause runtime or test failures.

### 2. Overusing `ResolutionContext` modifiers

Modifiers are intentionally short-lived. Reusing them for cross-phase state would couple two separate rule lifecycles and create hidden behavior. Persisted shield state must remain explicit in `ResolutionResult` and `Match`.

### 3. Unclear serialization expectations

The repository is currently in-memory, so persisted constructor support is sufficient for now. Exposing shield state in `match.toJSON()` should be a deliberate product decision, not an accidental leak.

### 4. Winner evaluation edge cases

If a vote is shielded, no player state changes. The implementation must avoid treating a prevented elimination as a real elimination when deciding whether to call winner logic.

## Suggested Implementation Order

1. Extend `EffectType`, default priority, and stage mapping.
2. Add `VoteShieldHandler` and extend `ResolutionResult`.
3. Persist and consume shields in `Match`.
4. Update backend validation surfaces.
5. Update frontend ability lists, metadata, and labels.
6. Add backend domain tests.
7. Add backend e2e and client tests.
8. Run backend and client test suites.

## Definition Of Done

The feature is ready when all of the following are true:

- `vote_shield` can be configured in templates and used through the existing API/UI flows.
- Shield state persists from action resolution into the next voting phase.
- The next vote elimination against the shielded player is prevented exactly once.
- The shield does not affect kill resolution or later votes after consumption.
- Existing ability behavior remains unchanged.
- Backend and client automated tests cover the new path.
