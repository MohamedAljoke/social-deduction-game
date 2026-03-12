import { describe, expect, it } from "vitest";
import { PublicNarrationEventMapper } from "../../../application/ai/PublicNarrationEvent";
import { PlayerStatus } from "../../../domain/entity/player";
import { Alignment } from "../../../domain/entity/template";
import { MatchDomainEvent } from "../../../domain/events/match-events";

describe("PublicNarrationEventMapper", () => {
  const mapper = new PublicNarrationEventMapper();

  it("maps match start, phase change, and match end events", () => {
    const events: MatchDomainEvent[] = [
      {
        type: "MatchStarted",
        matchId: "match-1",
        playerAssignments: [
          {
            playerId: "player-1",
            templateId: "template-1",
            alignment: Alignment.Hero,
          },
          {
            playerId: "player-2",
            templateId: "template-2",
            alignment: Alignment.Villain,
          },
        ],
      },
      { type: "PhaseAdvanced", matchId: "match-1", phase: "action" },
      {
        type: "MatchEnded",
        matchId: "match-1",
        winner: { kind: "alignment", alignment: Alignment.Hero },
      },
    ];

    expect(mapper.mapEvents(events)).toEqual([
      {
        kind: "start",
        matchId: "match-1",
        playerCount: 2,
        summary: "A partida comecou.",
      },
      {
        kind: "phase",
        matchId: "match-1",
        phase: "action",
        summary: "A partida avancou para a fase de action.",
      },
      {
        kind: "end",
        matchId: "match-1",
        winner: { kind: "alignment", alignment: Alignment.Hero },
        summary: "A partida terminou.",
      },
    ]);
  });

  it("maps public kill results into resolution and elimination triggers", () => {
    const events: MatchDomainEvent[] = [
      {
        type: "ActionsResolved",
        matchId: "match-1",
        effects: [
          {
            type: "kill",
            actorId: "player-1",
            targetIds: ["player-2"],
          },
          {
            type: "investigate",
            actorId: "player-3",
            targetIds: ["player-4"],
            data: { alignment: Alignment.Villain },
          },
        ],
      },
    ];

    expect(mapper.mapEvents(events)).toEqual([
      {
        kind: "resolution",
        matchId: "match-1",
        eliminationCount: 1,
        summary: "Uma eliminacao publica foi resolvida.",
      },
      {
        kind: "elimination",
        matchId: "match-1",
        playerId: "player-2",
        cause: "kill",
        summary: "Um jogador caiu durante a resolucao.",
      },
    ]);
  });

  it("filters private or unsafe resolution data", () => {
    const events: MatchDomainEvent[] = [
      {
        type: "ActionsResolved",
        matchId: "match-1",
        effects: [
          {
            type: "investigate",
            actorId: "player-1",
            targetIds: ["player-2"],
            data: { alignment: Alignment.Villain },
          },
          {
            type: "protect",
            actorId: "player-3",
            targetIds: ["player-4"],
          },
          {
            type: "kill_blocked",
            actorId: "player-5",
            targetIds: ["player-6"],
          },
        ],
      },
      { type: "VoteSubmitted", matchId: "match-1", voterId: "player-1", targetId: "player-2" },
      {
        type: "PlayerJoined",
        matchId: "match-1",
        player: {
          id: "player-7",
          name: "Eve",
          status: PlayerStatus.ALIVE,
          templateId: undefined,
        },
      },
    ];

    expect(mapper.mapEvents(events)).toEqual([]);
  });
});
