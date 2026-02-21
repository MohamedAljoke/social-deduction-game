type MatchStatus = "lobby" | "in_progress" | "finished";

class MatchSession {
  id: string;
  status: MatchStatus;
  match: Match; // Your domain engine
  createdAt: Date;
}

interface MatchRepository {
  save(match: MatchSession): Promise<void>;
  findById(id: string): Promise<MatchSession | null>;
  delete(id: string): Promise<void>;
}

class InMemoryMatchRepository implements MatchRepository {
  private matches = new Map<string, MatchSession>();
}
