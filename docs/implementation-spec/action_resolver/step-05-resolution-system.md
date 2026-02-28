# Step 05: Resolution System

## Goal
Implement deterministic staged resolution with delayed state mutation.

## Files
- `src/domain/services/ResolutionContext.ts` (new)
- `src/domain/services/EffectHandler.ts` (new)
- `src/domain/services/ActionResolver.ts` (new)
- `src/domain/services/handlers/RoleblockHandler.ts` (new)
- `src/domain/services/handlers/ProtectHandler.ts` (new)
- `src/domain/services/handlers/KillHandler.ts` (new)
- `src/domain/services/handlers/InvestigateHandler.ts` (new)

## Required Changes
- Add `ResolutionStage` enum:
  - `TARGET_MUTATION`, `DEFENSIVE`, `CANCELLATION`, `OFFENSIVE`, `READ`
- Define `EffectHandler` contract:
  - `effectType`
  - `stage`
  - `resolve(action, ctx, players, templates?)`
- Create `ResolutionContext` with:
  - string modifiers per player
  - pending state changes
  - effect results
- Implement built-in handlers:
  - roleblock writes `"roleblocked"`
  - protect writes `"protected"`
  - kill checks `"protected"` and queues `pending_death`
  - investigate returns target alignment
- Implement resolver:
  - group by stage
  - sort by priority desc inside stage
  - deterministic tie-breaker
  - cancel action if actor has `"roleblocked"`
  - commit state changes after all stages

## Output Contract
- Handlers never call lifecycle mutations directly.
- Commit phase is the only place that mutates players.

## Acceptance Criteria
- Protect blocks kill when processed earlier stage.
- Roleblocked actor action is cancelled.
- Investigate result contains alignment.

## Risks
- Ordering bugs if stage processing is bypassed.
- Hidden direct mutation inside handlers.

## Mitigation
- Add tests per mechanic and one mixed multi-action scenario.
