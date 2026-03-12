import {
  RealtimePublisher,
  GameMasterMessagePayload,
  MatchStartedPayload,
} from "../../domain/ports/RealtimePublisher";
import { MatchResponse, MatchWinner } from "../../domain/entity/match";
import { PhaseType } from "../../domain/entity/phase";
import { PlayerResponse } from "../../domain/entity/player";
import { EffectResult } from "../../domain/services/resolution";
import { ServerEvent } from "./mod";

export interface MatchBroadcaster {
  broadcastToMatch(matchId: string, event: ServerEvent): void;
  broadcastMatchUpdate(matchId: string, state: unknown): void;
  sendToPlayer(matchId: string, playerId: string, event: ServerEvent): void;
}

export class WebSocketPublisher implements RealtimePublisher {
  constructor(private readonly broadcaster: MatchBroadcaster) {}

  matchStarted(matchId: string, payload: MatchStartedPayload): void {
    this.broadcaster.broadcastToMatch(matchId, {
      type: "match_started",
      matchId,
      ...payload,
    });
  }

  matchUpdated(matchId: string, match: MatchResponse): void {
    this.broadcaster.broadcastMatchUpdate(matchId, match);
  }

  phaseChanged(matchId: string, phase: PhaseType): void {
    this.broadcaster.broadcastToMatch(matchId, {
      type: "phase_changed",
      matchId,
      phase,
    });
  }

  playerJoined(matchId: string, player: PlayerResponse): void {
    this.broadcaster.broadcastToMatch(matchId, {
      type: "player_joined",
      matchId,
      player,
    });
  }

  playerLeft(matchId: string, playerId: string): void {
    this.broadcaster.broadcastToMatch(matchId, {
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
    this.broadcaster.broadcastToMatch(matchId, {
      type: "action_submitted",
      matchId,
      actorId,
      EffectType,
      targetIds,
    });
  }

  matchEnded(matchId: string, winner: MatchWinner): void {
    this.broadcaster.broadcastToMatch(matchId, {
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
    this.broadcaster.broadcastToMatch(matchId, {
      type: "vote_submitted",
      matchId,
      voterId,
      targetId,
    });
  }

  effectResolved(matchId: string, effect: EffectResult): void {
    switch (effect.type) {
      case "kill":
        this.broadcaster.broadcastToMatch(matchId, {
          type: "player_killed",
          matchId,
          playerId: effect.targetIds[0],
        });
        break;
      case "investigate": {
        const alignment = effect.data?.["alignment"] as string | undefined;
        if (alignment) {
          this.broadcaster.sendToPlayer(matchId, effect.actorId, {
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

  gameMasterMessage(
    matchId: string,
    payload: GameMasterMessagePayload,
  ): void {
    this.broadcaster.broadcastToMatch(matchId, {
      type: "game_master_message",
      matchId,
      ...payload,
    });
  }
}
