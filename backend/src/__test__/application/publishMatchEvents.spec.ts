import { describe, expect, it, vi } from "vitest";
import { publishMatchEvents } from "../../application/publishMatchEvents";
import { Match, MatchStatus } from "../../domain/entity/match";
import { Player, PlayerResponse, PlayerStatus } from "../../domain/entity/player";
import { Alignment, Template } from "../../domain/entity/template";
import { RealtimePublisher } from "../../domain/ports/RealtimePublisher";
import { EffectResult } from "../../domain/services/resolution";

function createPublisher(): RealtimePublisher {
  return { publish: vi.fn() };
}

describe("publishMatchEvents", () => {
  it("publishes specialized events and sends the final snapshot before matchEnded", () => {
    const publisher = createPublisher();
    const player: PlayerResponse = {
      id: "player-1",
      name: "Alice",
      status: PlayerStatus.ALIVE,
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
      createLobbyMatch(),
      publisher,
    );

    const publishMock = vi.mocked(publisher.publish);

    expect(publishMock).toHaveBeenCalledWith({ type: "PlayerJoined", matchId: "match-1", player });
    expect(publishMock).toHaveBeenCalledWith({ type: "MatchStarted", matchId: "match-1" });
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
      createLobbyMatch(),
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
      createLobbyMatch(),
      publisher,
    );

    const publishMock = vi.mocked(publisher.publish);
    const calls = publishMock.mock.calls.map((c) => c[0].type);
    expect(calls).not.toContain("PlayerKilled");
    expect(calls).not.toContain("InvestigateResult");
    // Only MatchSnapshotUpdated should be published
    expect(calls).toEqual(["MatchSnapshotUpdated"]);
  });

  it("sends each player a snapshot with only their own role, and a public one without any", () => {
    const publisher = createPublisher();
    const match = createStartedMatch();

    publishMatchEvents(match.pullEvents(), match, publisher);

    const snapshot = vi
      .mocked(publisher.publish)
      .mock.calls.map((call) => call[0])
      .find((event) => event.type === "MatchSnapshotUpdated");
    if (snapshot?.type !== "MatchSnapshotUpdated") throw new Error("no snapshot published");

    expect(snapshot.publicView.players.every((player) => player.templateId === undefined)).toBe(true);
    for (const [playerId, view] of Object.entries(snapshot.viewsByPlayerId)) {
      const visibleRoles = view.players.filter((player) => player.templateId !== undefined);
      expect(visibleRoles.map((player) => player.id)).toEqual([playerId]);
    }
  });

  it("does not publish matchUpdated when no domain events were emitted", () => {
    const publisher = createPublisher();

    publishMatchEvents([], createLobbyMatch(), publisher);

    expect(publisher.publish).not.toHaveBeenCalled();
  });
});

function createLobbyMatch(): Match {
  return new Match({
    id: "match-1",
    name: "Test Match",
    createdAt: new Date("2026-03-10T12:00:00.000Z"),
    status: MatchStatus.LOBBY,
  });
}

function createStartedMatch(): Match {
  const match = createLobbyMatch();
  match.addPlayer(new Player({ id: "player-1", name: "Alice" }));
  match.addPlayer(new Player({ id: "player-2", name: "Bob" }));
  match.startWithTemplates([
    new Template("Detective", "template-1", Alignment.Hero, []),
    new Template("Assassin", "template-2", Alignment.Villain, []),
  ]);
  return match;
}
