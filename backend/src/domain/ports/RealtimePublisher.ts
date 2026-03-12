import { MatchResponse, MatchWinner } from "../entity/match";
import { PhaseType } from "../entity/phase";
import { PlayerResponse } from "../entity/player";
import { MatchPlayerAssignment } from "../events/match-events";
import { EffectResult } from "../services/resolution";

export interface MatchStartedPayload {
  playerAssignments: MatchPlayerAssignment[];
}

export interface GameMasterMessagePayload {
  messageId: string;
  kind: "start" | "phase" | "resolution" | "elimination" | "end";
  message: string;
  createdAt: string;
}

export interface RealtimePublisher {
  matchStarted(matchId: string, payload: MatchStartedPayload): void;
  matchUpdated(matchId: string, match: MatchResponse): void;
  phaseChanged(matchId: string, phase: PhaseType): void;
  playerJoined(matchId: string, player: PlayerResponse): void;
  playerLeft(matchId: string, playerId: string): void;
  actionSubmitted(
    matchId: string,
    actorId: string,
    EffectType: string,
    targetIds: string[],
  ): void;
  matchEnded(matchId: string, winner: MatchWinner): void;
  voteSubmitted(
    matchId: string,
    voterId: string,
    targetId: string | null,
  ): void;
  effectResolved(matchId: string, effect: EffectResult): void;
  gameMasterMessage(matchId: string, payload: GameMasterMessagePayload): void;
}
