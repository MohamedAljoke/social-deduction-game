import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { Match, MatchResponse } from "../domain/entity/match";

export interface CreateMatchInput {
  name?: string;
  config?: {
    showVotingTransparency?: boolean;
    aiGameMasterEnabled?: boolean;
  };
}

export class CreateMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(input: CreateMatchInput = {}): Promise<MatchResponse> {
    const match = Match.create(input.name ?? "match_one", input.config);
    await this.repository.save(match);

    return match.toJSON();
  }
}
