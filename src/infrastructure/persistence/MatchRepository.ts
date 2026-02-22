import { Match, MatchStatus } from "../../domain/models/match";

export interface MatchSession {
  id: string;
  match: Match;
  createdAt: Date;
}

export interface MatchRepository {
  save(match: MatchSession): Promise<void>;
  findById(id: string): Promise<MatchSession | null>;
  delete(id: string): Promise<void>;
}
