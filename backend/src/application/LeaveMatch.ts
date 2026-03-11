import { MatchNotFound, PlayerNotInMatch } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";
import { publishMatchEvents } from "./publishMatchEvents";

export interface LeaveMatchInput {
  matchId: string;
  playerId: string;
}

export class LeaveMatchUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly publisher: RealtimePublisher,
  ) {}

  async execute(input: LeaveMatchInput): Promise<MatchResponse> {
    const match = await this.repository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    const playerExists = match.getPlayers().some((p) => p.id === input.playerId);

    if (!playerExists) {
      throw new PlayerNotInMatch();
    }

    match.removePlayer(input.playerId);
    await this.repository.save(match);

    const result = match.toJSON();
    publishMatchEvents(match.pullEvents(), result, this.publisher);

    return result;
  }
}
