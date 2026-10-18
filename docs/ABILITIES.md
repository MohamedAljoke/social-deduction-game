# Abilities and how a night resolves

During the action phase every player with an ability picks targets. Nothing happens yet: each choice is
queued as an `Action`. When the phase moves to resolution, all queued actions resolve together, in an
order that makes the outcome the same whoever clicked first.

## The abilities

Each ability is defined once in `shared/src/ability-definitions.ts`, which the backend and the client both
import, so the UI's target picker and the server's rules can't disagree:

| Ability | Stage | Priority | Effect |
| --- | --- | --- | --- |
| Protect | defensive | 2 | The target survives a kill tonight |
| Vote shield | defensive | 2 | The target survives the next vote that would eliminate them |
| Roleblock | cancellation | 3 | The target's own action is cancelled |
| Kill | offensive | 0 | The target dies, unless protected |
| Investigate | read | 1 | The actor learns the target's alignment |

A definition also says how many targets the ability takes, whether a player may target themselves,
whether the target must be alive and whether a dead player may still use it. `Match.useAbility` checks
the phase and the `Ability` entity checks the rest, each with its own domain error, before the action is
queued.

## Stages, then priority

`ActionResolver` (`domain/services/resolution/`) runs the actions in fixed **stages**:

```text
target mutation ─► defensive ─► cancellation ─► offensive ─► read
```

Inside a stage, higher priority goes first, and ties break on the actor's id, then the effect, then the
targets, so the same set of actions always resolves the same way.

The order carries the rules:

- **Protect runs before kill.** A kill on a protected target becomes `kill_blocked`.
- **Roleblock runs before kill and investigate.** A roleblocked player's action is skipped.
- **Deaths are applied at the end.** A kill records a pending death, and players die only after every
  stage has run, so someone killed tonight still completes their own action this night.
- **Investigate reads last**, after everything else has settled.

## A handler per ability (open/closed)

Each ability is a class implementing `EffectHandler`, registered with the resolver:

```ts
export class KillHandler implements EffectHandler {
  public readonly effectType = EffectType.Kill;

  public resolve(action, ctx) {
    for (const targetId of action.targetIds) {
      if (ctx.hasModifier(targetId, "protected")) {
        ctx.pushResult({ type: "kill_blocked", actorId: action.actorId, targetIds: [targetId] });
        continue;
      }
      ctx.addStateChange({ type: "pending_death", targetId, sourceActionActorId: action.actorId });
      ctx.pushResult({ type: "kill", actorId: action.actorId, targetIds: [targetId] });
    }
  }
}
```

Handlers share a `ResolutionContext` that holds modifiers ("protected", "roleblocked"), pending state
changes and the results to announce. Adding an ability means adding a definition, one handler class and
one registration. No existing handler or `switch` changes.

## Roles and win conditions

A role is a `Template`: a name, an alignment (hero, villain or neutral), its abilities and a win condition.
The host can build their own roles in the lobby's template builder.

`WinConditionEvaluator` checks after every elimination:

- heroes win when no villain is left;
- villains win when they are at least as many as the heroes;
- a role with an `eliminate_alignment` condition wins on its own when the alignment it targets is gone,
  which is how neutral roles work.
