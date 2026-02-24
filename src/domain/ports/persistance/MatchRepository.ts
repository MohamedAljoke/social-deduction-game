import { Match } from "../../entity/match";

export interface MatchRepository {
  save(match: Match): Promise<void>;
  findById(id: string): Promise<Match | null>;
  list(): Promise<Match[]>;
  delete(id: string): Promise<void>;
}
