import { Action } from "../../entity/action";
import { Player } from "../../entity/player";
import { Template } from "../../entity/template";
import { EffectType } from "../../entity/ability";
import { EffectHandler, ResolutionStage } from "../EffectHandler";
import { ResolutionContext } from "../ResolutionContext";

export class ProtectHandler implements EffectHandler {
  public readonly effectType = EffectType.Protect;
  public readonly stage = ResolutionStage.DEFENSIVE;

  public resolve(
    action: Action,
    ctx: ResolutionContext,
    _players: Map<string, Player>,
    _templates?: Template[],
  ): void {
    for (const targetId of action.targetIds) {
      ctx.addModifier(targetId, "protected");
    }

    ctx.pushResult({
      type: "protect",
      actorId: action.actorId,
      targetIds: action.targetIds,
    });
  }
}
