import { EffectType } from "../../entity/ability";
import { Action, ResolutionStage } from "../../entity/action";
import { Player } from "../../entity/player";
import { Template } from "../../entity/template";
import { EffectHandler } from "../EffectHandler";
import { ResolutionContext } from "../ResolutionContext";

export class KillHandler implements EffectHandler {
  public readonly effectType = EffectType.Kill;
  public readonly stage = ResolutionStage.OFFENSIVE;

  public resolve(
    action: Action,
    ctx: ResolutionContext,
    _players: Map<string, Player>,
    _templates?: Template[],
  ): void {
    for (const targetId of action.targetIds) {
      if (ctx.hasModifier(targetId, "protected")) {
        ctx.pushResult({
          type: "kill_blocked",
          actorId: action.actorId,
          targetIds: [targetId],
        });
        continue;
      }

      ctx.addStateChange({
        type: "pending_death",
        targetId,
        sourceActionActorId: action.actorId,
      });
      ctx.pushResult({
        type: "kill",
        actorId: action.actorId,
        targetIds: [targetId],
      });
    }
  }
}
