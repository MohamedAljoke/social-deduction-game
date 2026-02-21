import { MatchRepository } from "../infrastructure/persistence/MatchRepository";
import { MatchNotFound, MatchAlreadyStarted } from "../domain/errors";
import { MatchStatus } from "../domain/match";

export class JoinMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string, playerName: string) {
    const session = await this.repository.findById(matchId);

    if (!session) {
      throw new MatchNotFound();
    }

    if (session.match.getStatus() !== MatchStatus.LOBBY) {
      throw new MatchAlreadyStarted();
    }

    session.match.addPlayer(playerName);

    await this.repository.save(session);

    return {
      matchId,
      players: session.match.getPlayers(),
    };
  }
}
