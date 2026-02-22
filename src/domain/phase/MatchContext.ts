import { PhaseType } from "../models/phase";
import { MatchStatus } from "../models/match";

export interface MatchContext {
  getCurrentPhase(): PhaseType;
  getStatus(): MatchStatus;
  tallyVotes(): string | undefined;
  getEliminatedThisRound(): string | undefined;
  getPlayerByID(id: string): any;
  getAlivePlayers(): any[];
  resolveActions(): void;
  setStatus(status: MatchStatus): void;
}

export type PhaseHook = (context: MatchContext) => void;
