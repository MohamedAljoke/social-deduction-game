import { Match } from "../../domain/entity/match";
import { MatchRepository } from "../../domain/ports/persistance/MatchRepository";

export class InMemoryMatchRepository implements MatchRepository {
  private matches = new Map<string, Match>();

  async save(match: Match): Promise<void> {
    this.matches.set(match.id, match);
  }

  async findById(id: string): Promise<Match | null> {
    return this.matches.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.matches.delete(id);
  }

  async list(): Promise<Match[]> {
    return Array.from(this.matches.values());
  }
}
