import { describe, it, expect } from "vitest";
import { gameReducer } from "@/context/GameContext";
import type { GameState } from "@/context/GameContext";
import { GAME_ACTIONS } from "@/types/gameActions";
import type { Match, Player } from "@/types/match";

const baseMatch: Match = {
  id: "match-1",
  name: "Test Match",
  status: "lobby",
  phase: "discussion",
  players: [],
  templates: [],
  actions: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  config: { showVotingTransparency: true, aiGameMasterEnabled: false },
};

const baseState: GameState = {
  matchId: "match-1",
  playerId: "player-1",
  playerName: "Alice",
  isHost: true,
  match: { ...baseMatch, players: [{ id: "player-1", name: "Alice", status: "alive" }] },
  gameMasterMessages: [],
  selectedAbility: null,
  selectedTarget: null,
  selectedVote: null,
  configuredTemplates: [],
  investigateResult: null,
};

const newPlayer: Player = { id: "player-2", name: "Bob", status: "alive" };

describe("gameReducer — ADD_PLAYER", () => {
  it("appends the player to the list", () => {
    const next = gameReducer(baseState, {
      type: GAME_ACTIONS.ADD_PLAYER,
      payload: newPlayer,
    });

    expect(next.match?.players).toHaveLength(2);
    expect(next.match?.players[1]).toEqual(newPlayer);
  });

  it("does not mutate the original players array", () => {
    const original = baseState.match!.players;
    gameReducer(baseState, { type: GAME_ACTIONS.ADD_PLAYER, payload: newPlayer });
    expect(original).toHaveLength(1);
  });

  it("is a no-op when match is null", () => {
    const noMatch = { ...baseState, match: null };
    const next = gameReducer(noMatch, {
      type: GAME_ACTIONS.ADD_PLAYER,
      payload: newPlayer,
    });
    expect(next).toBe(noMatch);
  });
});

describe("gameReducer — REMOVE_PLAYER", () => {
  const stateWithTwo: GameState = {
    ...baseState,
    match: {
      ...baseMatch,
      players: [
        { id: "player-1", name: "Alice", status: "alive" },
        { id: "player-2", name: "Bob", status: "alive" },
      ],
    },
  };

  it("removes the player with the given id", () => {
    const next = gameReducer(stateWithTwo, {
      type: GAME_ACTIONS.REMOVE_PLAYER,
      payload: "player-2",
    });

    expect(next.match?.players).toHaveLength(1);
    expect(next.match?.players[0].id).toBe("player-1");
  });

  it("leaves the list unchanged when id is not found", () => {
    const next = gameReducer(stateWithTwo, {
      type: GAME_ACTIONS.REMOVE_PLAYER,
      payload: "unknown-id",
    });

    expect(next.match?.players).toHaveLength(2);
  });

  it("is a no-op when match is null", () => {
    const noMatch = { ...baseState, match: null };
    const next = gameReducer(noMatch, {
      type: GAME_ACTIONS.REMOVE_PLAYER,
      payload: "player-1",
    });
    expect(next).toBe(noMatch);
  });
});

describe("gameReducer — UPDATE_MATCH", () => {
  it("hydrates configured templates and clears round selections when match returns to lobby", () => {
    const startedState: GameState = {
      ...baseState,
      selectedAbility: "kill",
      selectedTarget: "player-2",
      selectedVote: "player-2",
      investigateResult: { targetId: "player-2", alignment: "villain" },
      match: {
        ...baseMatch,
        status: "finished",
      },
    };

    const next = gameReducer(startedState, {
      type: GAME_ACTIONS.UPDATE_MATCH,
      payload: {
        ...baseMatch,
        status: "lobby",
        templates: [
          {
            id: "template-1",
            name: "Guardian",
            alignment: "hero",
            abilities: [{ id: "protect" }],
            winCondition: "team_parity",
            winConditionConfig: null,
          },
        ],
      },
    });

    expect(next.selectedAbility).toBeNull();
    expect(next.selectedTarget).toBeNull();
    expect(next.selectedVote).toBeNull();
    expect(next.investigateResult).toBeNull();
    expect(next.configuredTemplates).toEqual([
      {
        name: "Guardian",
        alignment: "hero",
        abilities: ["protect"],
        winCondition: "team_parity",
        winConditionConfig: undefined,
      },
    ]);
  });
});

describe("gameReducer — ADD_GAME_MASTER_MESSAGE", () => {
  it("appends a new narration entry", () => {
    const next = gameReducer(baseState, {
      type: GAME_ACTIONS.ADD_GAME_MASTER_MESSAGE,
      payload: {
        messageId: "msg-1",
        kind: "phase",
        message: "The lanterns dim as voting begins.",
        createdAt: "2026-01-01T00:01:00.000Z",
      },
    });

    expect(next.gameMasterMessages).toHaveLength(1);
    expect(next.gameMasterMessages[0].message).toBe(
      "The lanterns dim as voting begins.",
    );
  });

  it("deduplicates by message id", () => {
    const first = gameReducer(baseState, {
      type: GAME_ACTIONS.ADD_GAME_MASTER_MESSAGE,
      payload: {
        messageId: "msg-1",
        kind: "phase",
        message: "The lanterns dim as voting begins.",
        createdAt: "2026-01-01T00:01:00.000Z",
      },
    });

    const second = gameReducer(first, {
      type: GAME_ACTIONS.ADD_GAME_MASTER_MESSAGE,
      payload: {
        messageId: "msg-1",
        kind: "phase",
        message: "Duplicate line",
        createdAt: "2026-01-01T00:01:01.000Z",
      },
    });

    expect(second.gameMasterMessages).toHaveLength(1);
    expect(second.gameMasterMessages[0].message).toBe(
      "The lanterns dim as voting begins.",
    );
  });
});
