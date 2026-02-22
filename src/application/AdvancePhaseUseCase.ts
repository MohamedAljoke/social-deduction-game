import { MatchRepository } from "../domain/repositories/MatchRepository";
import { MatchNotFound } from "../domain/errors";

export class AdvancePhaseUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string) {
    const session = await this.repository.findById(matchId);

    if (!session) {
      throw new MatchNotFound();
    }

    const nextPhase = session.match.advancePhase();

    await this.repository.save(session);

    return {
      matchId,
      currentPhase: nextPhase,
      players: session.match.getPlayers(),
    };
  }
}
