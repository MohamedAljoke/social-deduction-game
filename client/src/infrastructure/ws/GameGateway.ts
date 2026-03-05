import type { WebSocketClient } from "./WebSocketClient";
import type {
  Alignment,
  Match,
  Player,
  PlayerAssignment,
} from "../../types/match";

const WS_URL = "ws://localhost:3000/ws";

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

  joinMatch(matchId: string, playerId: string, player?: { id: string; name: string; isHost: boolean }): void {
    this.ws.send("join_match", { matchId, playerId, player });
  }

  leaveMatch(matchId: string, playerId: string): void {
    this.ws.send("leave_match", { matchId, playerId });
  }

  submitAction(
    matchId: string,
    actorId: string,
    abilityId: string,
    targetIds: string[],
  ): void {
    this.ws.send("use_ability", { matchId, actorId, abilityId, targetIds });
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
    handler: (matchId: string, winner: Alignment) => void,
  ): () => void {
    return this.ws.on<{ matchId: string; winner: Alignment }>(
      "match_ended",
      (msg) => handler(msg.matchId, msg.winner),
    );
  }

  onError(handler: (code: string, message: string) => void): () => void {
    return this.ws.on<{ code: string; message: string }>("error", (msg) =>
      handler(msg.code, msg.message),
    );
  }
}
