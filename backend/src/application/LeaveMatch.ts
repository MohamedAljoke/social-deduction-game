import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";
import { publishMatchEvents } from "./publishMatchEvents";

export interface LeaveMatchInput {
  matchId: string;
  playerToken?: string;
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

    const player = match.identify(input.playerToken);
    match.removePlayer(player.id);
    await this.repository.save(match);

    publishMatchEvents(match.pullEvents(), match, this.publisher);

    return match.toJSON();
  }
}
