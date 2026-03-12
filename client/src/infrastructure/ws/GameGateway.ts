import type { WebSocketClient } from "./WebSocketClient";
import type {
  Match,
  MatchWinner,
  Player,
  PlayerAssignment,
} from "../../types/match";
import type { GameMasterMessage } from "../../types/events";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

export class GameGateway {
  private ws: WebSocketClient;

  constructor(ws: WebSocketClient) {
    this.ws = ws;
  }

  connect(url: string = WS_URL): void {
    this.ws.connect(url);
  }

  disconnect(): void {
    this.ws.disconnect();
  }

  joinMatch(matchId: string, playerId: string): void {
    this.ws.send("join_match", { matchId, playerId });
  }

  leaveMatch(matchId: string, playerId: string): void {
    this.ws.send("leave_match", { matchId, playerId });
  }

  submitAction(
    matchId: string,
    actorId: string,
    EffectType: string,
    targetIds: string[],
  ): void {
    this.ws.send("use_ability", { matchId, actorId, EffectType, targetIds });
  }

  castVote(matchId: string, voterId: string, targetId: string | null): void {
    this.ws.send("submit_vote", { matchId, voterId, targetId });
  }

  onConnected(handler: (clientId: string) => void): () => void {
    return this.ws.on<{ clientId: string }>("connected", (msg) =>
      handler(msg.clientId),
    );
  }

  onMatchUpdated(handler: (matchId: string, state: Match) => void): () => void {
    return this.ws.on<{ matchId: string; state: Match }>(
      "match_updated",
      (msg) => handler(msg.matchId, msg.state),
    );
  }

  onPhaseChanged(
    handler: (matchId: string, phase: string) => void,
  ): () => void {
    return this.ws.on<{ matchId: string; phase: string }>(
      "phase_changed",
      (msg) => handler(msg.matchId, msg.phase),
    );
  }

  onPlayerJoined(
    handler: (matchId: string, player: Player) => void,
  ): () => void {
    return this.ws.on<{ matchId: string; player: Player }>(
      "player_joined",
      (msg) => handler(msg.matchId, msg.player),
    );
  }

  onPlayerLeft(
    handler: (matchId: string, playerId: string) => void,
  ): () => void {
    return this.ws.on<{ matchId: string; playerId: string }>(
      "player_left",
      (msg) => handler(msg.matchId, msg.playerId),
    );
  }

  onPlayersSynced(
    handler: (matchId: string, players: Player[]) => void,
  ): () => void {
    return this.ws.on<{ matchId: string; players: Player[] }>(
      "players_synced",
      (msg) => handler(msg.matchId, msg.players),
    );
  }

  onMatchStarted(
    handler: (matchId: string, assignments: PlayerAssignment[]) => void,
  ): () => void {
    return this.ws.on<{
      matchId: string;
      playerAssignments: PlayerAssignment[];
    }>("match_started", (msg) => handler(msg.matchId, msg.playerAssignments));
  }

  onMatchEnded(
    handler: (matchId: string, winner: MatchWinner) => void,
  ): () => void {
    return this.ws.on<{ matchId: string; winner: MatchWinner }>(
      "match_ended",
      (msg) => handler(msg.matchId, msg.winner),
    );
  }

  onGameMasterMessage(
    handler: (matchId: string, message: GameMasterMessage) => void,
  ): () => void {
    return this.ws.on<{
      matchId: string;
      messageId: string;
      kind: GameMasterMessage["kind"];
      message: string;
      createdAt: string;
    }>("game_master_message", (msg) =>
      handler(msg.matchId, {
        messageId: msg.messageId,
        kind: msg.kind,
        message: msg.message,
        createdAt: msg.createdAt,
      }),
    );
  }

  onInvestigateResult(
    handler: (actorId: string, targetId: string, alignment: string) => void,
  ): () => void {
    return this.ws.on<{ actorId: string; targetId: string; alignment: string }>(
      "investigate_result",
      (msg) => handler(msg.actorId, msg.targetId, msg.alignment),
    );
  }

  onError(handler: (code: string, message: string) => void): () => void {
    return this.ws.on<{ code: string; message: string }>("error", (msg) =>
      handler(msg.code, msg.message),
    );
  }
}
