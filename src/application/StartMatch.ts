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

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  async execute(input: StartMatchInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    match.start();

    const players = match.getPlayers();
    const rawTemplates = input.templates;

    if (!rawTemplates || rawTemplates.length === 0) {
      throw new TemplateNotFound();
    }

    if (rawTemplates.length !== players.length) {
      throw new TemplatePlayerCountMismatch(
        rawTemplates.length,
        players.length,
      );
    }

    const templates: Template[] = rawTemplates.map((raw, index) => {
      const abilities = raw.abilities.map(
        (a) => new Ability(a.id as AbilityId),
      );

      return new Template(
        `template_${index}`,
        raw.alignment as Alignment,
        abilities,
      );
    });

    const shuffledTemplates = this.shuffle(templates);

    for (let index = 0; index < players.length; index++) {
      const player = players[index];
      const template = shuffledTemplates[index];

      player.assignTemplate(template.id);
    }

    match.setTemplates(templates);

    await this.matchRepository.save(match);

    return match.toJSON();
  }
}

