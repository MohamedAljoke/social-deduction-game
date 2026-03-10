import {
  RealtimePublisher,
  MatchStartedPayload,
} from "../../domain/ports/RealtimePublisher";
import { MatchResponse } from "../../domain/entity/match";
import { Alignment } from "../../domain/entity/template";
import { EffectResult } from "../../domain/services/resolution";
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
    EffectType: string,
    targetIds: string[],
  ): void {
    getWsManager().broadcastToMatch(matchId, {
      type: "action_submitted",
      matchId,
      actorId,
      EffectType,
      targetIds,
    });
  }

  matchEnded(matchId: string, winner: Alignment): void {
    getWsManager().broadcastToMatch(matchId, {
      type: "match_ended",
      matchId,
      winner,
    });
  }

  voteSubmitted(
    matchId: string,
    voterId: string,
    targetId: string | null,
  ): void {
    getWsManager().broadcastToMatch(matchId, {
      type: "vote_submitted",
      matchId,
      voterId,
      targetId,
    });
  }

  effectResolved(matchId: string, effect: EffectResult): void {
    switch (effect.type) {
      case "kill":
        getWsManager().broadcastToMatch(matchId, {
          type: "player_killed",
          matchId,
          playerId: effect.targetIds[0],
        });
        break;
      case "investigate": {
        const alignment = effect.data?.["alignment"] as string | undefined;
        if (alignment) {
          getWsManager().sendToPlayer(matchId, effect.actorId, {
            type: "investigate_result",
            matchId,
            actorId: effect.actorId,
            targetId: effect.targetIds[0],
            alignment,
          });
        }
        break;
      }
      // kill_blocked, protect, roleblock: no notification needed beyond match_updated
    }
  }
}
