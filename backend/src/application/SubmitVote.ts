import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { publishMatchEvents } from "./publishMatchEvents";

export interface SubmitVoteInput {
  matchId: string;
  playerToken?: string;
  targetId: string | null;
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

    const voter = match.identify(input.playerToken);
    match.submitVote(voter.id, input.targetId);

    await this.matchRepository.save(match);

    publishMatchEvents(match.pullEvents(), match, this.publisher);

    return match.toJSON(voter.id);
  }
}
