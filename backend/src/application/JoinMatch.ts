import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { Player } from "../domain/entity/player";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";

export interface JoinMatchInput {
  matchId: string;
  playerName: string;
}

export class JoinMatchUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly publisher: RealtimePublisher,
  ) {}

  async execute(input: JoinMatchInput): Promise<MatchResponse> {
    const match = await this.repository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    match.addPlayer(Player.create(input.playerName));
    await this.repository.save(match);

    const newPlayer = match.getPlayers()[match.getPlayers().length - 1];
    this.publisher.playerJoined(input.matchId, newPlayer);

    return match.toJSON();
  }
}
