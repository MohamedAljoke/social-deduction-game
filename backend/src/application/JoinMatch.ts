import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { Player } from "../domain/entity/player";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";
import { publishMatchEvents } from "./publishMatchEvents";

export interface JoinMatchInput {
  matchId: string;
  playerName: string;
}

export interface JoinMatchOutput {
  playerId: string;
  playerToken: string;
  match: MatchResponse;
}

export class JoinMatchUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly publisher: RealtimePublisher,
  ) {}

  async execute(input: JoinMatchInput): Promise<JoinMatchOutput> {
    const match = await this.repository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    const player = Player.create(input.playerName);
    match.addPlayer(player);
    await this.repository.save(match);

    publishMatchEvents(match.pullEvents(), match, this.publisher);

    return {
      playerId: player.id,
      playerToken: player.getToken(),
      match: match.toJSON(player.id),
    };
  }
}
