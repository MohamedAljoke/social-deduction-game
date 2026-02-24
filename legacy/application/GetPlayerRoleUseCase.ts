import { MatchRepository } from "../domain/repositories/MatchRepository";
import { MatchNotFound, PlayerNotFound, MissingTemplate } from "../domain/errors";

export class GetPlayerRoleUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string, playerId: string) {
    const session = await this.repository.findById(matchId);

    if (!session) {
      throw new MatchNotFound();
    }

    const player = session.match.getPlayerByID(playerId);
    const template = player.getTemplate();

    if (!template) {
      throw new MissingTemplate();
    }

    return {
      playerId: player.id,
      playerName: player.name,
      isAlive: player.isAlive(),
      role: {
        id: template.id,
        alignment: template.alignment,
        abilities: template.abilities.map(a => ({
          id: a.id,
          canUseWhenDead: a.canUseWhenDead,
        })),
      },
    };
  }
}
