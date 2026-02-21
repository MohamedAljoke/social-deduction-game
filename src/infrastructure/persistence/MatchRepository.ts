import { Match } from "../../domain/match";

export type MatchStatus = "lobby" | "in_progress" | "finished";

export interface MatchSession {
  id: string;
  status: MatchStatus;
  match: Match;
  createdAt: Date;
}

export interface MatchRepository {
  save(match: MatchSession): Promise<void>;
  findById(id: string): Promise<MatchSession | null>;
  delete(id: string): Promise<void>;
}
