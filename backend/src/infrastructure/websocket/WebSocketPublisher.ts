import {
  RealtimeEvent,
  RealtimePublisher,
} from "../../domain/ports/RealtimePublisher";
import { ServerEvent } from "./mod";

export interface MatchBroadcaster {
  broadcastToMatch(matchId: string, event: ServerEvent): void;
  broadcastMatchUpdate(matchId: string, state: unknown): void;
  sendToPlayer(matchId: string, playerId: string, event: ServerEvent): void;
}

export class WebSocketPublisher implements RealtimePublisher {
  constructor(private readonly broadcaster: MatchBroadcaster) {}

  publish(event: RealtimeEvent): void {
    switch (event.type) {
      case "PlayerJoined":
        this.broadcaster.broadcastToMatch(event.matchId, {
          type: "player_joined",
          matchId: event.matchId,
          player: event.player,
        });
        break;
      case "PlayerLeft":
        this.broadcaster.broadcastToMatch(event.matchId, {
          type: "player_left",
          matchId: event.matchId,
          playerId: event.playerId,
        });
        break;
      case "MatchStarted":
        this.broadcaster.broadcastToMatch(event.matchId, {
          type: "match_started",
          matchId: event.matchId,
          playerAssignments: event.playerAssignments,
        });
        break;
      case "VoteSubmitted":
        this.broadcaster.broadcastToMatch(event.matchId, {
          type: "vote_submitted",
          matchId: event.matchId,
          voterId: event.voterId,
          targetId: event.targetId,
        });
        break;
      case "PhaseChanged":
        this.broadcaster.broadcastToMatch(event.matchId, {
          type: "phase_changed",
          matchId: event.matchId,
          phase: event.phase,
        });
        break;
      case "EffectResolved":
        switch (event.effect.type) {
          case "kill":
            this.broadcaster.broadcastToMatch(event.matchId, {
              type: "player_killed",
              matchId: event.matchId,
              playerId: event.effect.targetIds[0],
            });
            break;
          case "investigate": {
            const alignment = event.effect.data?.["alignment"] as string | undefined;
            if (alignment) {
              this.broadcaster.sendToPlayer(event.matchId, event.effect.actorId, {
                type: "investigate_result",
                matchId: event.matchId,
                actorId: event.effect.actorId,
                targetId: event.effect.targetIds[0],
                alignment,
              });
            }
            break;
          }
        }
        break;
      case "MatchEnded":
        this.broadcaster.broadcastToMatch(event.matchId, {
          type: "match_ended",
          matchId: event.matchId,
          winner: event.winner,
        });
        break;
      case "MatchSnapshotUpdated":
        this.broadcaster.broadcastMatchUpdate(event.matchId, event.match);
        break;
      case "GameMasterMessage":
        this.broadcaster.broadcastToMatch(event.matchId, {
          type: "game_master_message",
          matchId: event.matchId,
          ...event.payload,
        });
        break;
    }
  }
}
