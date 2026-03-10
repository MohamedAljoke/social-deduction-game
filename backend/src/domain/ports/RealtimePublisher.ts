import { MatchResponse } from "../entity/match";
import { Alignment } from "../entity/template";
import { EffectResult } from "../services/resolution";

export interface MatchStartedPayload {
  playerAssignments: {
    playerId: string;
    templateId: string;
    alignment: string;
  }[];
}

export interface RealtimePublisher {
  matchStarted(matchId: string, payload: MatchStartedPayload): void;
  matchUpdated(matchId: string, match: MatchResponse): void;
  phaseChanged(matchId: string, phase: string): void;
  playerJoined(matchId: string, player: unknown): void;
  playerLeft(matchId: string, playerId: string): void;
  actionSubmitted(
    matchId: string,
    actorId: string,
    EffectType: string,
    targetIds: string[],
  ): void;
  matchEnded(matchId: string, winner: Alignment): void;
  voteSubmitted(
    matchId: string,
    voterId: string,
    targetId: string | null,
  ): void;
  effectResolved(matchId: string, effect: EffectResult): void;
}
