import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";

export interface CastVoteInput {
  matchId: string;
  voterId: string;
  targetId: string;
}

export class CastVoteUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(input: CastVoteInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    match.castVote(input.voterId, input.targetId);

    await this.matchRepository.save(match);

    return match.toJSON();
  }
}
