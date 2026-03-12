import { describe, expect, it } from "vitest";
import { NarrationContextBuilder } from "../../../application/ai/NarrationContextBuilder";
import { MatchResponse, MatchStatus } from "../../../domain/entity/match";
import { EffectType } from "../../../domain/entity/ability";
import { PlayerStatus } from "../../../domain/entity/player";
import { Alignment, WinCondition } from "../../../domain/entity/template";
import { PublicNarrationEvent } from "../../../application/ai/PublicNarrationEvent";

function createMatchResponse(): MatchResponse {
  return {
    id: "match-1",
    name: "Friday Night Match",
    createdAt: new Date("2026-03-10T12:00:00.000Z"),
    status: MatchStatus.STARTED,
    players: [
      {
        id: "player-1",
        name: "Alice",
        status: PlayerStatus.ALIVE,
        templateId: "template-1",
      },
      {
        id: "player-2",
        name: "Bob",
        status: PlayerStatus.DEAD,
        templateId: "template-2",
      },
    ],
    phase: "resolution",
    actions: [
      {
        actorId: "player-1",
        EffectType: EffectType.Investigate,
        targetIds: ["player-2"],
        cancelled: false,
      },
    ],
    templates: [
      {
        id: "template-1",
        name: "Detective",
        alignment: Alignment.Hero,
        abilities: [{ id: EffectType.Investigate }],
        winCondition: WinCondition.TeamParity,
        winConditionConfig: null,
      },
      {
        id: "template-2",
        name: "Assassin",
        alignment: Alignment.Villain,
        abilities: [{ id: EffectType.Kill }],
        winCondition: WinCondition.TeamParity,
        winConditionConfig: null,
      },
    ],
    votes: [{ voterId: "player-1", targetId: "player-2" }],
    config: { showVotingTransparency: true, aiGameMasterEnabled: true },
    winner: null,
    winnerAlignment: null,
    endedAt: null,
  };
}

describe("NarrationContextBuilder", () => {
  const builder = new NarrationContextBuilder(
    () => new Date("2026-03-12T04:00:00.000Z"),
  );

  it("builds a public narration context from the current match snapshot", () => {
    const match = createMatchResponse();
    const event: PublicNarrationEvent = {
      kind: "elimination",
      matchId: "match-1",
      playerId: "player-2",
      cause: "kill",
      summary: "A player was eliminated during resolution.",
    };

    expect(builder.build(match, event)).toEqual({
      matchId: "match-1",
      matchName: "Friday Night Match",
      phase: "resolution",
      players: [
        {
          id: "player-1",
          name: "Alice",
          status: "alive",
          templateName: "Detective",
        },
        {
          id: "player-2",
          name: "Bob",
          status: "dead",
          templateName: "Assassin",
        },
      ],
      templates: [
        {
          id: "template-1",
          name: "Detective",
          alignment: Alignment.Hero,
        },
        {
          id: "template-2",
          name: "Assassin",
          alignment: Alignment.Villain,
        },
      ],
      event: {
        kind: "elimination",
        summary: "Bob was eliminated during resolution.",
        occurredAt: "2026-03-12T04:00:00.000Z",
      },
      winner: null,
    });
  });

  it("includes winner data and formats end-of-match summaries", () => {
    const match = createMatchResponse();
    const event: PublicNarrationEvent = {
      kind: "end",
      matchId: "match-1",
      winner: {
        kind: "templates",
        templates: [
          {
            templateId: "template-1",
            templateName: "Detective",
            alignment: Alignment.Hero,
          },
        ],
      },
      summary: "The match has ended.",
    };

    const context = builder.build(match, event);

    expect(context.event).toEqual({
      kind: "end",
      summary: "Detective won the match.",
      occurredAt: "2026-03-12T04:00:00.000Z",
    });
    expect(context.winner).toEqual(event.winner);
  });

  it("does not carry unrelated public snapshot fields into the narration context", () => {
    const match = createMatchResponse();
    const event: PublicNarrationEvent = {
      kind: "resolution",
      matchId: "match-1",
      eliminationCount: 1,
      summary: "A public elimination was resolved.",
    };

    const context = builder.build(match, event);

    expect("actions" in context).toBe(false);
    expect("votes" in context).toBe(false);
    expect(context.event.summary).toBe("One public elimination was resolved.");
  });
});
