# Task 2.9 — Add Target Validation to submitAction

**Priority:** Medium (correctness — invalid targets silently reach effects)
**Phase:** 4

---

## Problem

`submitAction()` accepts any `targetIds` without checking:

- Whether targets exist as players
- Whether targets are alive (some abilities require live targets, others don't)
- Whether the actor is targeting themselves (some abilities forbid this)
- Whether the correct number of targets is provided (kill = 1, bus driver = 2)

`Player.act()` validates actor eligibility (has template, has ability, is alive) but target validation is entirely absent. Invalid targets silently pass through to the effect system, where `context.killPlayer()` will throw on a non-existent ID.

---

## Proposed Solution

Add target metadata to `Ability`:

```typescript
export class Ability {
  constructor(
    public readonly id: AbilityId,
    public readonly canUseWhenDead: boolean = false,
    public readonly targetCount: number = 1,
    public readonly canTargetSelf: boolean = false,
    public readonly requiresAliveTarget: boolean = true,
  ) {}
}
```

Validate in `Match.submitAction()`:

```typescript
public submitAction(actorId: string, abilityId: AbilityId, targetIds: string[]): void {
  this.ensurePhase("action");
  const player = this.getPlayerByID(actorId);
  const action = player.act(abilityId, targetIds);

  const ability = player.getTemplate()!.getAbility(abilityId)!;
  if (targetIds.length !== ability.targetCount)
    throw new InvalidTargetCount(ability.targetCount, targetIds.length);
  for (const targetId of targetIds) {
    const target = this.getPlayerByID(targetId);  // throws PlayerNotFound if absent
    if (ability.requiresAliveTarget && !target.isAlive())
      throw new PlayerIsDeadError();
    if (!ability.canTargetSelf && targetId === actorId)
      throw new CannotTargetSelf();
  }

  this.actionQueue.push(action);
}
```

---

## Acceptance Criteria

- [ ] `Ability` constructor extended with `targetCount`, `canTargetSelf`, `requiresAliveTarget`
- [ ] Error classes created: `InvalidTargetCount`, `CannotTargetSelf`
- [ ] `Match.submitAction()` validates target count, target existence, target liveness, and self-targeting
- [ ] All current ability definitions (`kill`, `protect`, `investigate`, `roleblock`) set appropriate metadata
- [ ] HTTP layer maps new errors to `400`
- [ ] Tests: wrong target count throws, dead target throws when not allowed, self-target throws when not allowed
- [ ] Existing action tests still pass

---

## Files to Modify

- `src/domain/ability.ts` — extend `Ability` class
- `src/domain/match.ts` — add validation in `submitAction()`
- `src/domain/errors.ts` — add `InvalidTargetCount`, `CannotTargetSelf`
- `src/http/middleware.ts` — map new errors to 400
