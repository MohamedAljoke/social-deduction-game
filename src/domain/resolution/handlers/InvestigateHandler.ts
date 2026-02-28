import { AbilityId } from "../../entity/ability";
import { ResolutionHandler, ResolutionHandlerInput } from "./types";

export class InvestigateHandler implements ResolutionHandler {
  readonly abilityId = AbilityId.Investigate;

  execute(input: ResolutionHandlerInput): void {
    const { intent, context } = input;
    const targetId = intent.targetIds[0];

    if (!targetId) {
      context.emit({
        type: "ability_failed",
        actorId: intent.actorId,
        abilityId: intent.abilityId,
        reason: "invalid_target",
      });
      return;
    }

    const target = context.match.getPlayers().find((player) => player.id === targetId);
    if (!target) {
      context.emit({
        type: "ability_failed",
        actorId: intent.actorId,
        abilityId: intent.abilityId,
        reason: "invalid_target",
      });
      return;
    }

    const templateId = target.getTemplateId();
    if (!templateId) {
      context.emit({
        type: "ability_failed",
        actorId: intent.actorId,
        abilityId: intent.abilityId,
        reason: "invalid_target",
      });
      return;
    }

    const template = context.match.getTemplates().find((item) => item.id === templateId);
    if (!template) {
      context.emit({
        type: "ability_failed",
        actorId: intent.actorId,
        abilityId: intent.abilityId,
        reason: "invalid_target",
      });
      return;
    }

    context.emit({
      type: "investigation_result",
      actorId: intent.actorId,
      targetId,
      alignment: template.alignment,
    });
  }
}
