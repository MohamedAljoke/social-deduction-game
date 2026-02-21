import { MatchRepository } from "../infrastructure/persistence/MatchRepository";
import { MatchNotFound } from "../domain/errors";

export class GetMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string) {
    const session = await this.repository.findById(matchId);

    if (!session) {
      throw new MatchNotFound();
    }

    return {
      id: session.id,
      status: session.status,
      currentPhase: session.match.getCurrentPhase(),
      players: session.match.getPlayers().map(p => ({
        id: p.id,
        name: p.name,
        isAlive: p.isAlive(),
      })),
      createdAt: session.createdAt,
    };
  }
}
