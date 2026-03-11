import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";

export type ClientEvent =
  | {
      type: "join_match";
      matchId: string;
      playerId: string;
      player?: { id: string; name: string; isHost: boolean };
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
  | { type: "player_joined"; matchId: string; player: unknown }
  | { type: "player_left"; matchId: string; playerId: string }
  | { type: "players_synced"; matchId: string; players: unknown[] }
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

interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
}

class MatchRoom {
  matchId: string;
  private clients: Map<string, Client> = new Map();
  private players: Map<string, PlayerInfo> = new Map();

  constructor(matchId: string) {
    this.matchId = matchId;
  }

  join(playerId: string, client: Client, player?: PlayerInfo): void {
    client.playerId = playerId;
    client.matchId = this.matchId;
    this.clients.set(playerId, client);
    if (player) {
      this.players.set(playerId, player);
    }
  }

  leave(playerId: string): void {
    this.clients.delete(playerId);
    this.players.delete(playerId);
  }

  getPlayers(): PlayerInfo[] {
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

  constructor(disconnectHandler?: DisconnectHandler) {
    this.disconnectHandler = disconnectHandler;
  }

  setDisconnectHandler(disconnectHandler: DisconnectHandler): void {
    this.disconnectHandler = disconnectHandler;
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

  private handleEvent(client: Client, event: ClientEvent): void {
    switch (event.type) {
      case "join_match": {
        let room = this.rooms.get(event.matchId);
        if (!room) {
          room = new MatchRoom(event.matchId);
          this.rooms.set(event.matchId, room);
        }
        room.join(event.playerId, client, event.player);

        // Send existing players to the new player
        const existingPlayers = room
          .getPlayers()
          .filter((p) => p.id !== event.playerId);
        room.sendToPlayer(event.playerId, {
          type: "players_synced",
          matchId: event.matchId,
          players: existingPlayers,
        });

        // Broadcast new player to existing players
        if (event.player) {
          room.broadcast(
            {
              type: "player_joined",
              matchId: event.matchId,
              player: event.player,
            },
            event.playerId,
          );
        }
        break;
      }

      case "leave_match": {
        const room = this.rooms.get(event.matchId);
        if (room && this.disconnectHandler) {
          Promise.resolve(
            this.disconnectHandler.handle({
              matchId: event.matchId,
              playerId: event.playerId,
            }),
          ).catch(console.error);
        }
        if (room) {
          room.broadcast(
            {
              type: "player_left",
              matchId: event.matchId,
              playerId: event.playerId,
            },
            event.playerId,
          );
          room.leave(event.playerId);
          if (room.getClientCount() === 0) {
            this.rooms.delete(event.matchId);
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

  close(): void {
    if (this.wss) {
      this.wss.close();
    }
  }
}

export const wsManager = (
  disconnectHandler?: DisconnectHandler,
): WebSocketManager => {
  const instance = new WebSocketManager(disconnectHandler);
  wsManagerInstance = instance;
  return instance;
};

let wsManagerInstance: WebSocketManager | null = null;

export const getWsManager = (): WebSocketManager => {
  if (!wsManagerInstance) {
    throw new Error("wsManager not initialized. Call wsManager() first.");
  }
  return wsManagerInstance;
};
