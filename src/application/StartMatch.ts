import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { Alignment, Template } from "../domain/entity/template";
import { Ability, EffectType } from "../domain/entity/ability";

export interface StartMatchInput {
  matchId: string;
  templates: {
    name?: string;
    alignment: Alignment;
    abilities: {
      id: EffectType;
      priority?: number;
      canUseWhenDead?: boolean;
      targetCount?: number;
      canTargetSelf?: boolean;
      requiresAliveTarget?: boolean;
    }[];
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
      const abilities = raw.abilities.map(
        (a) =>
          new Ability(
            a.id,
            a.priority,
            a.canUseWhenDead ?? false,
            a.targetCount ?? 1,
            a.canTargetSelf ?? false,
            a.requiresAliveTarget ?? true,
          ),
      );

      return new Template(
        `template_${index}`,
        raw.alignment,
        abilities,
        "default",
        true,
        raw.name,
      );
    });

    match.startWithTemplates(templates);

    await this.matchRepository.save(match);

    return match.toJSON();
  }
}
