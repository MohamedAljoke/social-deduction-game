import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket, { RawData } from "ws";
import { createApp } from "../../app";
import { MatchResponse } from "../../domain/entity/match";
import { JoinMatchOutput } from "../../application/JoinMatch";

const port = 4002;

describe("WebSocket E2E", () => {
  let server: ReturnType<typeof createApp>;

  beforeEach(async () => {
    server = createApp();
    await server.listen(port);
  });

  afterEach(async () => {
    await server.close();
  });

  it("authorizes a valid join and syncs authoritative player snapshots", async () => {
    const match = await createMatch("ws_match");
    const alice = await joinMatch(match.id, "Alice");
    const bob = await joinMatch(match.id, "Bob");
    const aliceSocket = await connectWebSocket();
    aliceSocket.send(
      JSON.stringify({
        type: "join_match",
        matchId: match.id,
        playerToken: alice.playerToken,
      }),
    );

    await expectMessage(aliceSocket, (event) => {
      expect(event).toMatchObject({
        type: "players_synced",
        matchId: match.id,
        players: [],
      });
    });

    const bobSocket = await connectWebSocket();
    bobSocket.send(
      JSON.stringify({
        type: "join_match",
        matchId: match.id,
        playerToken: bob.playerToken,
      }),
    );

    await expectMessage(bobSocket, (event) => {
      expect(event).toMatchObject({
        type: "players_synced",
        matchId: match.id,
        players: [
          {
            id: alice.playerId,
            name: "Alice",
            status: "alive",
          },
        ],
      });
    });

    await expectMessage(aliceSocket, (event) => {
      expect(event).toMatchObject({
        type: "player_joined",
        matchId: match.id,
        player: {
          id: bob.playerId,
          name: "Bob",
          status: "alive",
        },
      });
    });

    const aliceClosed = waitForClose(aliceSocket);
    const bobClosed = waitForClose(bobSocket);
    aliceSocket.close();
    bobSocket.close();
    await Promise.all([aliceClosed, bobClosed]);
  });

  it("sends each player a match update that shows only their own role", async () => {
    const match = await createMatch("roles_match");
    const alice = await joinMatch(match.id, "Alice");
    const bob = await joinMatch(match.id, "Bob");
    const aliceSocket = await joinRoom(match.id, alice.playerToken);
    const bobSocket = await joinRoom(match.id, bob.playerToken);

    const aliceUpdate = waitForType(aliceSocket, "match_updated");
    const bobUpdate = waitForType(bobSocket, "match_updated");
    await fetch(`http://localhost:${port}/match/${match.id}/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-player-token": alice.playerToken },
      body: JSON.stringify({}),
    });

    for (const [socketUpdate, self] of [
      [await aliceUpdate, alice],
      [await bobUpdate, bob],
    ] as const) {
      const state = socketUpdate.state as MatchResponse;
      const visible = state.players.filter((player) => player.templateId);
      expect(visible.map((player) => player.id)).toEqual([self.playerId]);
    }

    aliceSocket.close();
    bobSocket.close();
  });

  it("rejects a join with a token that belongs to no player and closes the socket", async () => {
    const match = await createMatch("spoof_match");
    const alice = await joinMatch(match.id, "Alice");

    const socket = await connectWebSocket();

    const closePromise = waitForClose(socket);
    socket.send(
      JSON.stringify({
        type: "join_match",
        matchId: match.id,
        playerToken: alice.playerId,
      }),
    );

    await expectMessage(socket, (event) => {
      expect(event).toMatchObject({
        type: "error",
        code: "invalid_player_token",
      });
    });

    await closePromise;
  });

  it("rejects an unknown match join with a structured error and closes the socket", async () => {
    const socket = await connectWebSocket();

    const closePromise = waitForClose(socket);
    socket.send(
      JSON.stringify({
        type: "join_match",
        matchId: "UNKNOWN1",
        playerToken: "player-token",
      }),
    );

    await expectMessage(socket, (event) => {
      expect(event).toMatchObject({
        type: "error",
        code: "match_not_found",
        message: "Match not found",
      });
    });

    await closePromise;
  });
});

async function createMatch(name: string) {
  const response = await fetch(`http://localhost:${port}/match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });

  return (await response.json()) as MatchResponse;
}

async function joinMatch(matchId: string, name: string): Promise<JoinMatchOutput> {
  const response = await fetch(`http://localhost:${port}/match/${matchId}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });

  return (await response.json()) as JoinMatchOutput;
}

async function joinRoom(matchId: string, playerToken: string): Promise<WebSocket> {
  const socket = await connectWebSocket();
  const synced = waitForType(socket, "players_synced");
  socket.send(JSON.stringify({ type: "join_match", matchId, playerToken }));
  await synced;
  return socket;
}

async function waitForType(
  socket: WebSocket,
  type: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const onMessage = (raw: RawData) => {
      const event = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (event.type !== type) return;
      socket.off("message", onMessage);
      resolve(event);
    };
    socket.on("message", onMessage);
  });
}

async function connectWebSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://localhost:${port}/ws`);
    socket.once("message", (raw) => {
      const event = JSON.parse(raw.toString()) as Record<string, unknown>;
      expect(event).toMatchObject({
        type: "connected",
        clientId: expect.any(String),
      });
      resolve(socket);
    });
    socket.once("error", reject);
  });
}

async function expectMessage(
  socket: WebSocket,
  assertion: (event: Record<string, unknown>) => void,
): Promise<void> {
  const event = await waitForMessage(socket);
  assertion(event);
}

async function waitForMessage(
  socket: WebSocket,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const onMessage = (raw: RawData) => {
      cleanup();
      resolve(JSON.parse(raw.toString()) as Record<string, unknown>);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onClose = () => {
      cleanup();
      reject(new Error("Socket closed before the expected message arrived"));
    };
    const cleanup = () => {
      socket.off("message", onMessage);
      socket.off("error", onError);
      socket.off("close", onClose);
    };

    socket.once("message", onMessage);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

async function waitForClose(socket: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (
      socket.readyState === WebSocket.CLOSED ||
      socket.readyState === WebSocket.CLOSING
    ) {
      resolve();
      return;
    }

    socket.once("close", () => resolve());
  });
}
