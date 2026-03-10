import {
  AbilityDoesNotBelongToUser,
  PlayerHasNoTemplate,
  PlayerNotInMatch,
  TemplateNotFound,
} from "../../errors";
import { EffectType } from "../../entity/ability";
import { Action, DEFAULT_STAGE_BY_EFFECT } from "../../entity/action";
import { Player } from "../../entity/player";
import { Template } from "../../entity/template";

export class AbilityActionFactory {
  public create(
    actorId: string,
    effectType: EffectType,
    targetIds: string[],
    players: Player[],
    templates: Template[],
  ): Action {
    const uniqueTargetIds = [...new Set(targetIds)];
    const playersById = new Map(players.map((player) => [player.id, player]));

    const actor = playersById.get(actorId);
    if (!actor) {
      throw new PlayerNotInMatch();
    }

    const templateId = actor.getTemplateId();
    if (!templateId) {
      throw new PlayerHasNoTemplate();
    }

    const template = templates.find((candidate) => candidate.id === templateId);
    if (!template) {
      throw new TemplateNotFound();
    }

    const ability = template.getAbility(effectType);
    if (!ability) {
      throw new AbilityDoesNotBelongToUser();
    }

    const targets = uniqueTargetIds.map((targetId) => {
      const target = playersById.get(targetId);
      if (!target) {
        throw new PlayerNotInMatch();
      }
      return target;
    });

    ability.validateUsage({
      actor,
      targets,
    });

    return new Action(
      actorId,
      ability.id,
      ability.priority,
      DEFAULT_STAGE_BY_EFFECT[ability.id],
      uniqueTargetIds,
    );
  }
}
