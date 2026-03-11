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

    publisher.playerJoined("match-1", {
      id: "player-1",
      name: "Alice",
      status: PlayerStatus.ALIVE,
      templateId: "template-1",
    });

    publisher.effectResolved("match-1", {
      type: "investigate",
      actorId: "player-1",
      targetIds: ["player-2"],
      data: { alignment: Alignment.Villain },
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
    expect(broadcaster.sendToPlayer).toHaveBeenCalledWith("match-1", "player-1", {
      type: "investigate_result",
      matchId: "match-1",
      actorId: "player-1",
      targetId: "player-2",
      alignment: Alignment.Villain,
    });
  });
});
