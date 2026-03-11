import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { ActionResolver } from "../domain/services/resolution";
import { publishMatchEvents } from "./publishMatchEvents";

export interface AdvancePhaseInput {
  matchId: string;
}

export class AdvancePhaseUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly publisher: RealtimePublisher,
    private readonly actionResolver: ActionResolver,
  ) {}

  async execute(input: AdvancePhaseInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    const newPhase = match.advancePhase();

    if (newPhase === "resolution") {
      match.resolveActions(this.actionResolver);
    }

    await this.matchRepository.save(match);

    const result = match.toJSON();
    publishMatchEvents(match.pullEvents(), result, this.publisher);

    return result;
  }
}
