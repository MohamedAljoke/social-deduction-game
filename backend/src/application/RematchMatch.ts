import { MatchNotFound } from "../domain/errors";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";
import { MatchResponse } from "../domain/entity/match";
import { publishMatchEvents } from "./publishMatchEvents";

export interface RematchMatchInput {
  matchId: string;
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

    match.rematch();
    await this.matchRepository.save(match);

    const result = match.toJSON();
    publishMatchEvents(match.pullEvents(), result, this.publisher);

    return result;
  }
}
