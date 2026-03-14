import { describe, expect, it, vi } from "vitest";
import {
  AiNarrator,
  NarrationContext,
  NarrationResult,
} from "../../../application/ai/AiNarrator";
import { publishMatchNarration } from "../../../application/ai/publishMatchNarration";
import { EffectType } from "../../../domain/entity/ability";
import { MatchResponse, MatchStatus } from "../../../domain/entity/match";
import { PlayerStatus } from "../../../domain/entity/player";
import { Alignment, WinCondition } from "../../../domain/entity/template";
import { RealtimePublisher } from "../../../domain/ports/RealtimePublisher";

function createPublisher(): RealtimePublisher {
  return { publish: vi.fn() };
}

function createNarrator(
  implementation: (input: NarrationContext) => Promise<NarrationResult | null>,
): AiNarrator {
  return {
    generateNarration: vi.fn(implementation),
  };
}

function createMatch(aiGameMasterEnabled: boolean): MatchResponse {
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
        name: "Oracle",
        alignment: Alignment.Hero,
        abilities: [{ id: EffectType.Investigate }],
        winCondition: WinCondition.TeamParity,
        winConditionConfig: null,
      },
      {
        id: "template-2",
        name: "Nightblade",
        alignment: Alignment.Villain,
        abilities: [{ id: EffectType.Kill }],
        winCondition: WinCondition.TeamParity,
        winConditionConfig: null,
      },
    ],
    votes: [],
    config: { showVotingTransparency: true, aiGameMasterEnabled },
    winner: null,
    winnerAlignment: null,
    endedAt: null,
  };
}

describe("publishMatchNarration", () => {
  it("does nothing when AI narration is disabled", async () => {
    const publisher = createPublisher();
    const narrator = createNarrator(async () => ({
      kind: "start",
      message: "ignored",
    }));

    await publishMatchNarration(
      [
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
      ],
      createMatch(false),
      narrator,
      publisher,
    );

    expect(narrator.generateNarration).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it("publishes narrator output for eligible public events", async () => {
    const publisher = createPublisher();
    const narrator = createNarrator(async () => ({
      kind: "elimination",
      message: "Nightblade Bob falls and the room holds its breath.",
    }));

    await publishMatchNarration(
      [
        {
          type: "ActionsResolved",
          matchId: "match-1",
          effects: [
            {
              type: "kill",
              actorId: "player-1",
              targetIds: ["player-2"],
            },
          ],
        },
      ],
      createMatch(true),
      narrator,
      publisher,
    );

    expect(narrator.generateNarration).toHaveBeenCalledTimes(2);
    expect(publisher.publish).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "GameMasterMessage",
        matchId: "match-1",
        payload: expect.objectContaining({
          kind: "elimination",
          message: "Nightblade Bob falls and the room holds its breath.",
        }),
      }),
    );
  });

  it("publishes a sleeping fallback instead of surfacing provider failure", async () => {
    const publisher = createPublisher();
    const narrator = createNarrator(async () => {
      throw new Error("out of credits");
    });

    await publishMatchNarration(
      [
        {
          type: "ActionsResolved",
          matchId: "match-1",
          effects: [
            {
              type: "kill",
              actorId: "player-1",
              targetIds: ["player-2"],
            },
          ],
        },
      ],
      createMatch(true),
      narrator,
      publisher,
    );

    expect(publisher.publish).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "GameMasterMessage",
        matchId: "match-1",
        payload: expect.objectContaining({
          kind: "elimination",
          message:
            "O mestre do jogo esta dormindo, mas um jogador caiu durante a resolucao.",
        }),
      }),
    );
  });
});
