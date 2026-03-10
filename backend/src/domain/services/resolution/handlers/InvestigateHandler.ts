import { EffectType } from "../../../entity/ability";
import { Action, ResolutionStage } from "../../../entity/action";
import { Player } from "../../../entity/player";
import { Template } from "../../../entity/template";
import { EffectHandler } from "../EffectHandler";
import { ResolutionContext } from "../ResolutionContext";

export class InvestigateHandler implements EffectHandler {
  public readonly effectType = EffectType.Investigate;
  public readonly stage = ResolutionStage.READ;

  public resolve(
    action: Action,
    ctx: ResolutionContext,
    players: Map<string, Player>,
    templates?: Template[],
  ): void {
    const templatesById = new Map((templates ?? []).map((t) => [t.id, t]));

    for (const targetId of action.targetIds) {
      const target = players.get(targetId);
      const templateId = target?.getTemplateId();
      const alignment = templateId
        ? templatesById.get(templateId)?.alignment
        : undefined;

      ctx.pushResult({
        type: "investigate",
        actorId: action.actorId,
        targetIds: [targetId],
        data: { alignment },
      });
    }
  }
}
