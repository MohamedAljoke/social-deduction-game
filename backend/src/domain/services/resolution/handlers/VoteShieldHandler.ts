import { EffectType } from "../../../entity/ability";
import { Action } from "../../../entity/action";
import { Player } from "../../../entity/player";
import { Template } from "../../../entity/template";
import { EffectHandler } from "../EffectHandler";
import { ResolutionContext } from "../ResolutionContext";

export class VoteShieldHandler implements EffectHandler {
  public readonly effectType = EffectType.VoteShield;

  public resolve(
    action: Action,
    ctx: ResolutionContext,
    _players: Map<string, Player>,
    _templates?: Template[],
  ): void {
    for (const targetId of action.targetIds) {
      ctx.addStateChange({
        type: "vote_shield",
        targetId,
        sourceActionActorId: action.actorId,
      });
    }

    ctx.pushResult({
      type: "vote_shield",
      actorId: action.actorId,
      targetIds: action.targetIds,
    });
  }
}
