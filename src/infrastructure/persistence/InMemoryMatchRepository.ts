import { MatchRepository, MatchSession } from "./MatchRepository";

export class InMemoryMatchRepository implements MatchRepository {
  private matches = new Map<string, MatchSession>();

  async save(match: MatchSession): Promise<void> {
    this.matches.set(match.id, match);
  }

  async findById(id: string): Promise<MatchSession | null> {
    return this.matches.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.matches.delete(id);
  }
}
