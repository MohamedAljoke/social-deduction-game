import {
  RealtimePublisher,
  MatchStartedPayload,
} from "../../domain/ports/RealtimePublisher";
import { MatchResponse } from "../../domain/entity/match";
import { wsManager } from "../websocket/mod";

export class WebSocketPublisher implements RealtimePublisher {
  matchStarted(matchId: string, payload: MatchStartedPayload): void {
    wsManager.broadcastToMatch(matchId, {
      type: "match_started",
      matchId,
      ...payload,
    });
  }

  matchUpdated(matchId: string, match: MatchResponse): void {
    wsManager.broadcastMatchUpdate(matchId, match);
  }

  phaseChanged(matchId: string, phase: string): void {
    wsManager.broadcastToMatch(matchId, {
      type: "phase_changed",
      matchId,
      phase,
    });
  }

  playerJoined(matchId: string, player: unknown): void {
    wsManager.broadcastToMatch(matchId, {
      type: "player_joined",
      matchId,
      player,
    });
  }

  playerLeft(matchId: string, playerId: string): void {
    wsManager.broadcastToMatch(matchId, {
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
    wsManager.broadcastToMatch(matchId, {
      type: "action_submitted",
      matchId,
      actorId,
      abilityId,
      targetIds,
    });
  }

  playerKilled(matchId: string, playerId: string): void {
    wsManager.broadcastToMatch(matchId, {
      type: "player_killed",
      matchId,
      playerId,
    });
  }

  matchEnded(matchId: string, winner: string): void {
    wsManager.broadcastToMatch(matchId, {
      type: "match_ended",
      matchId,
      winner,
    });
  }
}
