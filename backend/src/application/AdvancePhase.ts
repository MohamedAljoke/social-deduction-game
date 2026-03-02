import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { MatchNotFound, MatchNotStarted } from "../domain/errors";
import { MatchResponse, MatchStatus } from "../domain/entity/match";

export interface AdvancePhaseInput {
  matchId: string;
}

export class AdvancePhaseUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(input: AdvancePhaseInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    match.advancePhase();

    await this.matchRepository.save(match);

    return match.toJSON();
  }
}
