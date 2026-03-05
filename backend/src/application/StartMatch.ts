import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import {
  MatchNotFound,
  TemplateNotFound,
  TemplatePlayerCountMismatch,
} from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { Alignment, Template } from "../domain/entity/template";
import { Ability, AbilityId } from "../domain/entity/ability";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";

export interface StartMatchInput {
  matchId: string;
  templates: {
    name?: string;
    alignment: Alignment;
    abilities: { id: AbilityId }[];
  }[];
}

export class StartMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly publisher: RealtimePublisher,
  ) {}

  async execute(input: StartMatchInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    const templates = input.templates.map((raw, index) => {
      const abilities = raw.abilities.map((a) => new Ability(a.id));
      const name = raw.name?.trim() || "Citizen";

      return new Template(name, `template_${index}`, raw.alignment, abilities);
    });

    match.startWithTemplates(templates);

    await this.matchRepository.save(match);

    const result = match.toJSON();

    const playerAssignments = result.players.map((p) => ({
      playerId: p.id,
      templateId: p.templateId!,
      alignment:
        result.templates.find((t) => t.id === p.templateId)?.alignment ??
        "unknown",
    }));

    this.publisher.matchStarted(input.matchId, { playerAssignments });
    this.publisher.matchUpdated(input.matchId, result);

    return result;
  }
}
