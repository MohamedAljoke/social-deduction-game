# Task 2.10 — Wire ResolutionEvent into the Pipeline

**Priority:** Medium (required for player feedback and night summaries)
**Phase:** 4

---

## Problem

`resolution/ResolutionEvent.ts` defines the event types but nothing emits or consumes them:

```typescript
export type ResolutionEventType = "killed" | "protected" | "kill_blocked" | "action_failed";

export interface ResolutionEvent {
  type: ResolutionEventType;
  actorId: string;
  targetIds: string[];
  abilityId: AbilityId;
  message?: string;
}
```

There is no way for:

- Players to learn they were protected or roleblocked
- Investigation results to be delivered (the method exists on `Match` but no endpoint serves it)
- A "night summary" to be generated

---

## Proposed Solution

Add `emit()` to `ResolutionContext` and collect events during resolution:

```typescript
interface ResolutionContext {
  killPlayer(id: string): void;
  isPlayerAlive(id: string): boolean;
  getPlayerAlignment(id: string): string;
  emit(event: ResolutionEvent): void;  // ← new
}
```

Effects emit events alongside their side effects:

```typescript
class KillEffect implements IAbilityEffect {
  execute(action, allActions, context, state) {
    if (action.cancelled) return;
    for (const targetId of action.targetIds) {
      if (!state.getSet("protected").has(targetId)) {
        context.killPlayer(targetId);
        context.emit({ type: "killed", actorId: action.actorId,
                       targetIds: [targetId], abilityId: action.abilityId });
      } else {
        context.emit({ type: "kill_blocked", actorId: action.actorId,
                       targetIds: [targetId], abilityId: action.abilityId });
      }
    }
  }
}
```

`Match.resolveActions()` collects emitted events and stores them so a use case can expose them.

A new `GetNightSummaryUseCase` (or extension to `GetMatchUseCase`) returns the events from the most recent resolution phase.

---

## Acceptance Criteria

- [ ] `ResolutionContext` includes `emit(event: ResolutionEvent): void`
- [ ] `Match.resolveActions()` builds context with `emit` that collects events into a list
- [ ] `KillEffect` emits `"killed"` or `"kill_blocked"` events
- [ ] `ProtectEffect` emits `"protected"` event
- [ ] `InvestigateEffect` emits an investigation event (type TBD)
- [ ] `RoleblockEffect` emits a `"action_failed"` or `"roleblocked"` event
- [ ] `Match` exposes `getLastNightEvents(): ResolutionEvent[]`
- [ ] A use case or endpoint exposes night events to callers
- [ ] `getInvestigationResult()` on `Match` can be deprecated in favour of events
- [ ] All existing tests pass

---

## Files to Modify

- `src/domain/resolution/ResolutionContext.ts` — add `emit`
- `src/domain/match.ts` — collect events in `resolveActions()`
- `src/domain/effects/KillEffect.ts`
- `src/domain/effects/ProtectEffect.ts`
- `src/domain/effects/InvestigateEffect.ts`
- `src/domain/effects/RoleblockEffect.ts`
- `src/application/GetMatchUseCase.ts` (or new use case)
- `src/http/routes/matches.ts` — add night summary endpoint
