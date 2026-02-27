import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import {
  MatchNotFound,
  TemplateNotFound,
  TemplatePlayerCountMismatch,
} from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { Alignment, Template } from "../domain/entity/template";
import { Ability, AbilityId } from "../domain/entity/ability";

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
      const abilities = raw.abilities.map((a) => new Ability(a.id));

      return new Template(`template_${index}`, raw.alignment, abilities);
    });

    match.startWithTemplates(templates);

    await this.matchRepository.save(match);

    return match.toJSON();
  }
}
