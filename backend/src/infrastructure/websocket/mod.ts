import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { DomainError } from "../../domain/errors";
import { PlayerResponse } from "../../domain/entity/player";

export type ClientEvent =
  | {
      type: "join_match";
      matchId: string;
      playerId: string;
    }
  | { type: "leave_match"; matchId: string; playerId: string }
  | {
      type: "use_ability";
      matchId: string;
      actorId: string;
      EffectType: string;
      targetIds: string[];
    }
  | {
      type: "submit_vote";
      matchId: string;
      voterId: string;
      targetId: string | null;
    };

export type ServerEvent =
  | { type: "connected"; clientId: string }
  | { type: "player_joined"; matchId: string; player: PlayerResponse }
  | { type: "player_left"; matchId: string; playerId: string }
  | { type: "players_synced"; matchId: string; players: PlayerResponse[] }
  | { type: "match_started"; matchId: string; playerAssignments: Assignment[] }
  | { type: "phase_changed"; matchId: string; phase: string }
  | {
      type: "action_submitted";
      matchId: string;
      actorId: string;
      EffectType: string;
      targetIds: string[];
    }
  | {
      type: "vote_submitted";
      matchId: string;
      voterId: string;
      targetId: string | null;
    }
  | { type: "match_updated"; matchId: string; state: unknown }
  | { type: "player_killed"; matchId: string; playerId: string }
  | { type: "match_ended"; matchId: string; winner: unknown }
  | {
      type: "game_master_message";
      matchId: string;
      messageId: string;
      kind: "start" | "phase" | "resolution" | "elimination" | "end";
      message: string;
      createdAt: string;
    }
  | {
      type: "investigate_result";
      matchId: string;
      actorId: string;
      targetId: string;
      alignment: string;
    }
  | { type: "error"; code: string; message: string };

export interface Assignment {
  playerId: string;
  templateId: string;
  alignment: string;
}

export interface Client {
  id: string;
  playerId?: string;
  matchId?: string;
  socket: WebSocket;
}

export interface DisconnectHandler {
  handle(input: { matchId: string; playerId: string }): Promise<void> | void;
}

export interface JoinAuthorizer {
  authorize(
    input: { matchId: string; playerId: string },
  ): Promise<PlayerResponse> | PlayerResponse;
}

class MatchRoom {
  matchId: string;
  private clients: Map<string, Client> = new Map();
  private players: Map<string, PlayerResponse> = new Map();

  constructor(matchId: string) {
    this.matchId = matchId;
  }

  join(playerId: string, client: Client, player: PlayerResponse): void {
    client.playerId = playerId;
    client.matchId = this.matchId;
    this.clients.set(playerId, client);
    this.players.set(playerId, player);
  }

  leave(playerId: string): void {
    this.clients.delete(playerId);
    this.players.delete(playerId);
  }

  getPlayers(): PlayerResponse[] {
    return Array.from(this.players.values());
  }

  broadcast(event: ServerEvent, excludePlayerId?: string): void {
    const message = JSON.stringify(event);
    for (const [_, client] of this.clients) {
      if (excludePlayerId && client.playerId === excludePlayerId) continue;
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
      }
    }
  }

  broadcastMatchUpdate(state: unknown): void {
    this.broadcast({
      type: "match_updated",
      matchId: this.matchId,
      state,
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getPlayerIds(): string[] {
    return Array.from(this.clients.keys());
  }

  sendToPlayer(playerId: string, event: ServerEvent): void {
    const client = this.clients.get(playerId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(event));
    }
  }
}

export class WebSocketManager {
  private wss?: WebSocketServer;
  private rooms: Map<string, MatchRoom> = new Map();
  private clients: Map<string, Client> = new Map();
  private clientCounter = 0;
  private disconnectHandler?: DisconnectHandler;
  private joinAuthorizer?: JoinAuthorizer;

  constructor(
    disconnectHandler?: DisconnectHandler,
    joinAuthorizer?: JoinAuthorizer,
  ) {
    this.disconnectHandler = disconnectHandler;
    this.joinAuthorizer = joinAuthorizer;
  }

  setDisconnectHandler(disconnectHandler: DisconnectHandler): void {
    this.disconnectHandler = disconnectHandler;
  }

  setJoinAuthorizer(joinAuthorizer: JoinAuthorizer): void {
    this.joinAuthorizer = joinAuthorizer;
  }

  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (socket, _) => {
      const clientId = `client_${++this.clientCounter}`;
      const client: Client = { id: clientId, socket };

      this.clients.set(clientId, client);

      socket.send(JSON.stringify({ type: "connected", clientId }));

      socket.on("message", (data) => {
        try {
          const event = JSON.parse(data.toString()) as ClientEvent;
          this.handleEvent(client, event);
        } catch {
          client.socket.send(
            JSON.stringify({
              type: "error",
              code: "invalid_event",
              message: "Failed to parse event",
            }),
          );
        }
      });

      socket.on("close", () => {
        this.handleDisconnect(client);
      });
    });
  }

  async close(): Promise<void> {
    for (const client of this.clients.values()) {
      if (
        client.socket.readyState === WebSocket.OPEN ||
        client.socket.readyState === WebSocket.CONNECTING
      ) {
        client.socket.terminate();
      }
    }

    this.clients.clear();
    this.rooms.clear();

    if (!this.wss) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.wss!.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.wss = undefined;
  }

  private handleEvent(client: Client, event: ClientEvent): void {
    switch (event.type) {
      case "join_match": {
        void this.handleJoinMatch(client, event);
        break;
      }

      case "leave_match": {
        if (
          (client.matchId && client.matchId !== event.matchId) ||
          (client.playerId && client.playerId !== event.playerId)
        ) {
          this.sendErrorAndClose(
            client,
            "unauthorized_leave",
            "Socket identity does not match the requested leave event",
          );
          break;
        }

        const matchId = client.matchId ?? event.matchId;
        const playerId = client.playerId ?? event.playerId;
        const room = this.rooms.get(matchId);
        if (room && this.disconnectHandler) {
          Promise.resolve(
            this.disconnectHandler.handle({
              matchId,
              playerId,
            }),
          ).catch(console.error);
        }
        if (room) {
          room.broadcast(
            {
              type: "player_left",
              matchId,
              playerId,
            },
            playerId,
          );
          room.leave(playerId);
          if (room.getClientCount() === 0) {
            this.rooms.delete(matchId);
          }
        }
        break;
      }

      default:
        client.socket.send(
          JSON.stringify({
            type: "error",
            code: "event_not_implemented",
            message: `Event type ${(event as ClientEvent).type} not implemented`,
          }),
        );
    }
  }

  private async handleJoinMatch(
    client: Client,
    event: Extract<ClientEvent, { type: "join_match" }>,
  ): Promise<void> {
    if (!this.joinAuthorizer) {
      this.sendErrorAndClose(
        client,
        "join_authorizer_unavailable",
        "WebSocket join authorization is not configured",
      );
      return;
    }

    try {
      const player = await this.joinAuthorizer.authorize({
        matchId: event.matchId,
        playerId: event.playerId,
      });

      let room = this.rooms.get(event.matchId);
      if (!room) {
        room = new MatchRoom(event.matchId);
        this.rooms.set(event.matchId, room);
      }
      room.join(event.playerId, client, player);

      const existingPlayers = room
        .getPlayers()
        .filter((candidate) => candidate.id !== event.playerId);
      room.sendToPlayer(event.playerId, {
        type: "players_synced",
        matchId: event.matchId,
        players: existingPlayers,
      });

      room.broadcast(
        {
          type: "player_joined",
          matchId: event.matchId,
          player,
        },
        event.playerId,
      );
    } catch (error) {
      const wsError = this.mapJoinError(error);
      this.sendErrorAndClose(client, wsError.code, wsError.message);
    }
  }

  private mapJoinError(error: unknown): { code: string; message: string } {
    if (error instanceof DomainError) {
      return {
        code: error.code,
        message: error.message,
      };
    }

    return {
      code: "unauthorized_join",
      message: "Failed to authorize websocket room join",
    };
  }

  private sendErrorAndClose(
    client: Client,
    code: string,
    message: string,
  ): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(
        JSON.stringify({
          type: "error",
          code,
          message,
        }),
      );
      client.socket.close();
    }
  }

  private handleDisconnect(client: Client): void {
    if (client.matchId) {
      const room = this.rooms.get(client.matchId);
      if (room && client.playerId) {
        room.leave(client.playerId);
        if (room.getClientCount() === 0) {
          this.rooms.delete(client.matchId);
        }
      }
    }
    this.clients.delete(client.id);
  }

  broadcastToMatch(matchId: string, event: ServerEvent): void {
    const room = this.rooms.get(matchId);
    if (room) {
      room.broadcast(event);
    }
  }

  broadcastMatchUpdate(matchId: string, state: unknown): void {
    const room = this.rooms.get(matchId);
    if (room) {
      room.broadcastMatchUpdate(state);
    }
  }

  sendToPlayer(matchId: string, playerId: string, event: ServerEvent): void {
    const room = this.rooms.get(matchId);
    if (room) {
      room.sendToPlayer(playerId, event);
    }
  }
}
