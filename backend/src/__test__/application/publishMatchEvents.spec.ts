import { describe, expect, it, vi } from "vitest";
import { publishMatchEvents } from "../../application/publishMatchEvents";
import { MatchResponse, MatchStatus } from "../../domain/entity/match";
import { PlayerResponse, PlayerStatus } from "../../domain/entity/player";
import { Alignment } from "../../domain/entity/template";
import { RealtimePublisher } from "../../domain/ports/RealtimePublisher";
import { EffectResult } from "../../domain/services/resolution";

function createPublisher(): RealtimePublisher {
  return { publish: vi.fn() };
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
    config: { showVotingTransparency: true, aiGameMasterEnabled: false },
    winner: { kind: "alignment", alignment: Alignment.Hero },
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
        {
          type: "MatchEnded",
          matchId: "match-1",
          winner: { kind: "alignment", alignment: Alignment.Hero },
        },
      ],
      createMatchResponse(),
      publisher,
    );

    const publishMock = vi.mocked(publisher.publish);

    expect(publishMock).toHaveBeenCalledWith({ type: "PlayerJoined", matchId: "match-1", player });
    expect(publishMock).toHaveBeenCalledWith({
      type: "MatchStarted",
      matchId: "match-1",
      playerAssignments: [{ playerId: "player-1", templateId: "template-1", alignment: Alignment.Hero }],
    });
    expect(publishMock).toHaveBeenCalledWith({ type: "PhaseChanged", matchId: "match-1", phase: "resolution" });
    expect(publishMock).toHaveBeenCalledWith({
      type: "InvestigateResult",
      matchId: "match-1",
      actorId: "player-1",
      targetId: "player-2",
      alignment: Alignment.Villain,
    });

    const calls = publishMock.mock.calls;
    const snapshotIndex = calls.findIndex((c) => c[0].type === "MatchSnapshotUpdated");
    const endedIndex = calls.findIndex((c) => c[0].type === "MatchEnded");

    expect(snapshotIndex).toBeGreaterThanOrEqual(0);
    expect(endedIndex).toBeGreaterThanOrEqual(0);
    expect(snapshotIndex).toBeLessThan(endedIndex);

    expect(publishMock).toHaveBeenCalledWith({ type: "MatchSnapshotUpdated", matchId: "match-1", match: createMatchResponse() });
    expect(publishMock).toHaveBeenCalledWith({ type: "MatchEnded", matchId: "match-1", winner: { kind: "alignment", alignment: Alignment.Hero } });
  });

  it("maps kill effect to PlayerKilled event", () => {
    const publisher = createPublisher();
    const killEffect: EffectResult = {
      type: "kill",
      actorId: "player-1",
      targetIds: ["player-2"],
    };

    publishMatchEvents(
      [{ type: "ActionsResolved", matchId: "match-1", effects: [killEffect] }],
      createMatchResponse(),
      publisher,
    );

    const publishMock = vi.mocked(publisher.publish);
    expect(publishMock).toHaveBeenCalledWith({
      type: "PlayerKilled",
      matchId: "match-1",
      playerId: "player-2",
    });
  });

  it("does not publish events for non-visible effects like protect and roleblock", () => {
    const publisher = createPublisher();
    const effects: EffectResult[] = [
      { type: "protect", actorId: "player-1", targetIds: ["player-2"] },
      { type: "roleblock", actorId: "player-3", targetIds: ["player-4"] },
    ];

    publishMatchEvents(
      [{ type: "ActionsResolved", matchId: "match-1", effects }],
      createMatchResponse(),
      publisher,
    );

    const publishMock = vi.mocked(publisher.publish);
    const calls = publishMock.mock.calls.map((c) => c[0].type);
    expect(calls).not.toContain("PlayerKilled");
    expect(calls).not.toContain("InvestigateResult");
    // Only MatchSnapshotUpdated should be published
    expect(calls).toEqual(["MatchSnapshotUpdated"]);
  });

  it("does not publish matchUpdated when no domain events were emitted", () => {
    const publisher = createPublisher();

    publishMatchEvents([], createMatchResponse(), publisher);

    expect(publisher.publish).not.toHaveBeenCalled();
  });
});
