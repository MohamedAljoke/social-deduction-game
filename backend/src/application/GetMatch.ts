import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";

export interface GetMatchInput {
  matchId: string;
  playerToken?: string;
}

export class GetMatchUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(input: GetMatchInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    const viewerId = input.playerToken ? match.identify(input.playerToken).id : null;
    return match.toJSON(viewerId);
  }
}
