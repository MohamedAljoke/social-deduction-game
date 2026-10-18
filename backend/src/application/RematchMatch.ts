import { MatchNotFound } from "../domain/errors";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";
import { MatchResponse } from "../domain/entity/match";
import { publishMatchEvents } from "./publishMatchEvents";

export interface RematchMatchInput {
  matchId: string;
  playerToken?: string;
}

export class RematchMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly publisher: RealtimePublisher,
  ) {}

  async execute(input: RematchMatchInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    const requester = match.identify(input.playerToken);
    match.rematch();
    await this.matchRepository.save(match);

    publishMatchEvents(match.pullEvents(), match, this.publisher);

    return match.toJSON(requester.id);
  }
}
