import { PhaseType } from "../phase";
import { MatchStatus } from "../match";

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
