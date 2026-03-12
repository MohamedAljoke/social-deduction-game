import { AiNarrator } from "./ai/AiNarrator";
import { publishMatchNarration } from "./ai/publishMatchNarration";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import {
  Alignment,
  Template,
  WinCondition,
  WinConditionConfig,
} from "../domain/entity/template";
import { Ability, EffectType } from "../domain/entity/ability";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";
import { publishMatchEvents } from "./publishMatchEvents";

export interface StartMatchInput {
  matchId: string;
  templates: {
    name?: string;
    alignment: Alignment;
    abilities: { id: EffectType }[];
    winCondition?: WinCondition;
    winConditionConfig?: WinConditionConfig;
  }[];
}

export class StartMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly publisher: RealtimePublisher,
    private readonly narrator: AiNarrator,
  ) {}

  async execute(input: StartMatchInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    const templates = input.templates.map((raw, index) => {
      const abilities = raw.abilities.map((a) => new Ability(a.id));
      const name = raw.name?.trim() || "Citizen";

      return new Template(
        name,
        `template_${index}`,
        raw.alignment,
        abilities,
        raw.winCondition ?? WinCondition.TeamParity,
        raw.winConditionConfig,
      );
    });

    match.startWithTemplates(templates);

    await this.matchRepository.save(match);

    const result = match.toJSON();
    const events = match.pullEvents();
    publishMatchEvents(events, result, this.publisher);
    void publishMatchNarration(events, result, this.narrator, this.publisher);

    return result;
  }
}
