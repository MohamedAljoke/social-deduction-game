import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import {
  MatchNotFound,
  TemplateNotFound,
  TemplatePlayerCountMismatch,
} from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { Alignment, Template } from "../domain/entity/template";
import { Ability, AbilityId } from "../domain/entity/ability";
import { defaultAbilityCatalog } from "../domain/abilities";

export interface StartMatchInput {
  matchId: string;
  templates: {
    alignment: Alignment;
    abilities: { id: AbilityId }[];
  }[];
}

export class StartMatchUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(input: StartMatchInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    const templates = input.templates.map((raw, index) => {
      const abilities = raw.abilities.map((a) => {
        const definition = defaultAbilityCatalog.getDefinition(a.id);
        return new Ability(
          a.id,
          definition.targeting.canUseWhenDead,
          definition.targeting.targetCount,
          definition.targeting.canTargetSelf,
          definition.targeting.requiresAliveTarget,
        );
      });

      return new Template(`template_${index}`, raw.alignment, abilities);
    });

    match.startWithTemplates(templates);

    await this.matchRepository.save(match);

    return match.toJSON();
  }
}
