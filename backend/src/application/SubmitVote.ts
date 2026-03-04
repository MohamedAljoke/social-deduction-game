import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";

export interface SubmitVoteInput {
  matchId: string;
  voterId: string;
  targetId: string;
}

export class SubmitVoteUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly publisher: RealtimePublisher,
  ) {}

  async execute(input: SubmitVoteInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    match.submitVote(input.voterId, input.targetId);

    await this.matchRepository.save(match);

    this.publisher.voteSubmitted(input.matchId, input.voterId, input.targetId);
    this.publisher.matchUpdated(input.matchId, match.toJSON());

    return match.toJSON();
  }
}
