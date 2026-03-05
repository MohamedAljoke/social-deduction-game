import { Match, MatchResponse } from "../domain/entity/match";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";

export class ListMatchesUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(): Promise<MatchResponse[]> {
    const matches = await this.repository.list();

    return matches.map((match: Match) => match.toJSON());
  }
}
