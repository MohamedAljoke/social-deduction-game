import { describe, expect, it, vi } from "vitest";
import { Alignment } from "../../../domain/entity/template";
import { PlayerStatus } from "../../../domain/entity/player";
import { WebSocketPublisher } from "../../../infrastructure/websocket/WebSocketPublisher";

function createBroadcaster() {
  return {
    broadcastToMatch: vi.fn(),
    broadcastMatchUpdate: vi.fn(),
    sendToPlayer: vi.fn(),
  };
}

describe("WebSocketPublisher", () => {
  it("publishes through the injected broadcaster without global websocket setup", () => {
    const broadcaster = createBroadcaster();
    const publisher = new WebSocketPublisher(broadcaster);

    publisher.publish({
      type: "PlayerJoined",
      matchId: "match-1",
      player: { id: "player-1", name: "Alice", status: PlayerStatus.ALIVE, templateId: "template-1" },
    });

    expect(broadcaster.broadcastToMatch).toHaveBeenCalledWith("match-1", {
      type: "player_joined",
      matchId: "match-1",
      player: {
        id: "player-1",
        name: "Alice",
        status: PlayerStatus.ALIVE,
        templateId: "template-1",
      },
    });
  });

  it("broadcasts PlayerKilled to the match room", () => {
    const broadcaster = createBroadcaster();
    const publisher = new WebSocketPublisher(broadcaster);

    publisher.publish({
      type: "PlayerKilled",
      matchId: "match-1",
      playerId: "player-2",
    });

    expect(broadcaster.broadcastToMatch).toHaveBeenCalledWith("match-1", {
      type: "player_killed",
      matchId: "match-1",
      playerId: "player-2",
    });
  });

  it("sends InvestigateResult only to the actor", () => {
    const broadcaster = createBroadcaster();
    const publisher = new WebSocketPublisher(broadcaster);

    publisher.publish({
      type: "InvestigateResult",
      matchId: "match-1",
      actorId: "player-1",
      targetId: "player-2",
      alignment: Alignment.Villain,
    });

    expect(broadcaster.sendToPlayer).toHaveBeenCalledWith("match-1", "player-1", {
      type: "investigate_result",
      matchId: "match-1",
      actorId: "player-1",
      targetId: "player-2",
      alignment: Alignment.Villain,
    });
    expect(broadcaster.broadcastToMatch).not.toHaveBeenCalled();
  });

  it("broadcasts game master messages to the match room", () => {
    const broadcaster = createBroadcaster();
    const publisher = new WebSocketPublisher(broadcaster);

    publisher.publish({
      type: "GameMasterMessage",
      matchId: "match-1",
      payload: {
        messageId: "message-1",
        kind: "phase",
        message: "The game master stirs as voting descends.",
        createdAt: "2026-03-12T04:00:00.000Z",
      },
    });

    expect(broadcaster.broadcastToMatch).toHaveBeenCalledWith("match-1", {
      type: "game_master_message",
      matchId: "match-1",
      messageId: "message-1",
      kind: "phase",
      message: "The game master stirs as voting descends.",
      createdAt: "2026-03-12T04:00:00.000Z",
    });
  });
});
