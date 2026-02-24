import { Match } from "../domain/entity/match";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";

export class ListMatchesUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(): Promise<Match[]> {
    const match = await this.repository.list();

    return match;
  }
}
