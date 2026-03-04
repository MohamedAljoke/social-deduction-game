import { MatchResponse } from "../entity/match";

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
    abilityId: string,
    targetIds: string[],
  ): void;
  playerKilled(matchId: string, playerId: string): void;
  matchEnded(matchId: string, winner: string): void;
  voteSubmitted(matchId: string, voterId: string, targetId: string): void;
}
