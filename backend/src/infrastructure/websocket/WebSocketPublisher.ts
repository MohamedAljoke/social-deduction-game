import {
  RealtimePublisher,
  MatchStartedPayload,
} from "../../domain/ports/RealtimePublisher";
import { MatchResponse } from "../../domain/entity/match";
import { getWsManager } from "./mod";

export class WebSocketPublisher implements RealtimePublisher {
  matchStarted(matchId: string, payload: MatchStartedPayload): void {
    getWsManager().broadcastToMatch(matchId, {
      type: "match_started",
      matchId,
      ...payload,
    });
  }

  matchUpdated(matchId: string, match: MatchResponse): void {
    getWsManager().broadcastMatchUpdate(matchId, match);
  }

  phaseChanged(matchId: string, phase: string): void {
    getWsManager().broadcastToMatch(matchId, {
      type: "phase_changed",
      matchId,
      phase,
    });
  }

  playerJoined(matchId: string, player: unknown): void {
    getWsManager().broadcastToMatch(matchId, {
      type: "player_joined",
      matchId,
      player,
    });
  }

  playerLeft(matchId: string, playerId: string): void {
    getWsManager().broadcastToMatch(matchId, {
      type: "player_left",
      matchId,
      playerId,
    });
  }

  actionSubmitted(
    matchId: string,
    actorId: string,
    abilityId: string,
    targetIds: string[],
  ): void {
    getWsManager().broadcastToMatch(matchId, {
      type: "action_submitted",
      matchId,
      actorId,
      abilityId,
      targetIds,
    });
  }

  playerKilled(matchId: string, playerId: string): void {
    getWsManager().broadcastToMatch(matchId, {
      type: "player_killed",
      matchId,
      playerId,
    });
  }

  matchEnded(matchId: string, winner: string): void {
    getWsManager().broadcastToMatch(matchId, {
      type: "match_ended",
      matchId,
      winner,
    });
  }

  voteSubmitted(matchId: string, voterId: string, targetId: string): void {
    getWsManager().broadcastToMatch(matchId, {
      type: "vote_submitted",
      matchId,
      voterId,
      targetId,
    });
  }
}
