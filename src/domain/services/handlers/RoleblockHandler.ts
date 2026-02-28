import { Action } from "../../entity/action";
import { Player } from "../../entity/player";
import { Template } from "../../entity/template";
import { EffectType } from "../../entity/ability";
import { EffectHandler, ResolutionStage } from "../EffectHandler";
import { ResolutionContext } from "../ResolutionContext";

export class RoleblockHandler implements EffectHandler {
  public readonly effectType = EffectType.Roleblock;
  public readonly stage = ResolutionStage.CANCELLATION;

  public resolve(
    action: Action,
    ctx: ResolutionContext,
    _players: Map<string, Player>,
    _templates?: Template[],
  ): void {
    for (const targetId of action.targetIds) {
      ctx.addModifier(targetId, "roleblocked");
    }

    ctx.pushResult({
      type: "roleblock",
      actorId: action.actorId,
      targetIds: action.targetIds,
    });
  }
}
