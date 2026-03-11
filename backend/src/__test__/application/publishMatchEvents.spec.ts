import { describe, expect, it, vi } from "vitest";
import { publishMatchEvents } from "../../application/publishMatchEvents";
import { MatchResponse, MatchStatus } from "../../domain/entity/match";
import { PlayerResponse, PlayerStatus } from "../../domain/entity/player";
import { Alignment } from "../../domain/entity/template";
import { EffectResult } from "../../domain/services/resolution";
import { RealtimePublisher } from "../../domain/ports/RealtimePublisher";

function createPublisher(): RealtimePublisher {
  return {
    matchStarted: vi.fn(),
    matchUpdated: vi.fn(),
    phaseChanged: vi.fn(),
    playerJoined: vi.fn(),
    playerLeft: vi.fn(),
    actionSubmitted: vi.fn(),
    matchEnded: vi.fn(),
    voteSubmitted: vi.fn(),
    effectResolved: vi.fn(),
  };
}

function createMatchResponse(): MatchResponse {
  return {
    id: "match-1",
    name: "Test Match",
    createdAt: new Date("2026-03-10T12:00:00.000Z"),
    status: MatchStatus.FINISHED,
    players: [],
    phase: "resolution",
    actions: [],
    templates: [],
    votes: [],
    config: { showVotingTransparency: true },
    winnerAlignment: Alignment.Hero,
    endedAt: new Date("2026-03-10T12:05:00.000Z"),
  };
}

describe("publishMatchEvents", () => {
  it("publishes specialized events and sends the final snapshot before matchEnded", () => {
    const publisher = createPublisher();
    const player: PlayerResponse = {
      id: "player-1",
      name: "Alice",
      status: PlayerStatus.ALIVE,
      templateId: "template-1",
    };
    const effect: EffectResult = {
      type: "investigate",
      actorId: "player-1",
      targetIds: ["player-2"],
      data: { alignment: Alignment.Villain },
    };

    publishMatchEvents(
      [
        { type: "PlayerJoined", matchId: "match-1", player },
        {
          type: "MatchStarted",
          matchId: "match-1",
          playerAssignments: [
            {
              playerId: "player-1",
              templateId: "template-1",
              alignment: Alignment.Hero,
            },
          ],
        },
        { type: "PhaseAdvanced", matchId: "match-1", phase: "resolution" },
        { type: "ActionsResolved", matchId: "match-1", effects: [effect] },
        { type: "MatchEnded", matchId: "match-1", winner: Alignment.Hero },
      ],
      createMatchResponse(),
      publisher,
    );

    expect(publisher.playerJoined).toHaveBeenCalledWith("match-1", player);
    expect(publisher.matchStarted).toHaveBeenCalledWith("match-1", {
      playerAssignments: [
        {
          playerId: "player-1",
          templateId: "template-1",
          alignment: Alignment.Hero,
        },
      ],
    });
    expect(publisher.phaseChanged).toHaveBeenCalledWith(
      "match-1",
      "resolution",
    );
    expect(publisher.effectResolved).toHaveBeenCalledWith("match-1", effect);

    const matchUpdatedOrder = vi.mocked(publisher.matchUpdated).mock
      .invocationCallOrder[0];
    const matchEndedOrder = vi.mocked(publisher.matchEnded).mock
      .invocationCallOrder[0];

    expect(matchUpdatedOrder).toBeLessThan(matchEndedOrder);
    expect(publisher.matchUpdated).toHaveBeenCalledWith(
      "match-1",
      createMatchResponse(),
    );
    expect(publisher.matchEnded).toHaveBeenCalledWith(
      "match-1",
      Alignment.Hero,
    );
  });

  it("does not publish matchUpdated when no domain events were emitted", () => {
    const publisher = createPublisher();

    publishMatchEvents([], createMatchResponse(), publisher);

    expect(publisher.matchUpdated).not.toHaveBeenCalled();
    expect(publisher.matchEnded).not.toHaveBeenCalled();
  });
});
