import { MatchRepository } from "../infrastructure/persistence/MatchRepository";
import { MatchNotFound } from "../domain/errors";

export class SubmitVoteUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string, voterId: string, targetId: string) {
    const session = await this.repository.findById(matchId);

    if (!session) {
      throw new MatchNotFound();
    }

    session.match.submitVote(voterId, targetId);

    await this.repository.save(session);

    return {
      matchId,
      voterId,
      targetId,
    };
  }
}
