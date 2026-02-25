import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";

export interface StartMatchInput {
  matchId: string;
}

export class StartMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(input: StartMatchInput): Promise<MatchResponse> {
    const match = await this.repository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    match.start();
    await this.repository.save(match);

    return match.toJSON();
  }
}

