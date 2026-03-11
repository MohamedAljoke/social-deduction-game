import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket, { RawData } from "ws";
import { createApp } from "../../app";
import { MatchResponse } from "../../domain/entity/match";
import { PlayerResponse } from "../../domain/entity/player";

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
    const alicePlayer = findPlayer(alice, "Alice");
    const bobPlayer = findPlayer(bob, "Bob");

    const aliceSocket = await connectWebSocket();
    aliceSocket.send(
      JSON.stringify({
        type: "join_match",
        matchId: match.id,
        playerId: alicePlayer.id,
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
        playerId: bobPlayer.id,
      }),
    );

    await expectMessage(bobSocket, (event) => {
      expect(event).toMatchObject({
        type: "players_synced",
        matchId: match.id,
        players: [
          {
            id: alicePlayer.id,
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
          id: bobPlayer.id,
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

  it("rejects a spoofed player join with a structured error and closes the socket", async () => {
    const match = await createMatch("spoof_match");
    await joinMatch(match.id, "Alice");

    const socket = await connectWebSocket();

    const closePromise = waitForClose(socket);
    socket.send(
      JSON.stringify({
        type: "join_match",
        matchId: match.id,
        playerId: "spoofed-player-id",
      }),
    );

    await expectMessage(socket, (event) => {
      expect(event).toMatchObject({
        type: "error",
        code: "player_not_in_match",
        message: "Player is not part of this match",
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
        playerId: "player-id",
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

async function joinMatch(matchId: string, name: string): Promise<MatchResponse> {
  const response = await fetch(`http://localhost:${port}/match/${matchId}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });

  return (await response.json()) as MatchResponse;
}

function findPlayer(match: MatchResponse, name: string): PlayerResponse {
  const player = match.players.find((candidate) => candidate.name === name);
  if (!player) {
    throw new Error(`Expected player ${name} to exist in match ${match.id}`);
  }

  return player;
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
