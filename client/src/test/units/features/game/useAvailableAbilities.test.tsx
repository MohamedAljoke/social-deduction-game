import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAvailableAbilities } from "@/features/game/hooks/useAvailableAbilities";
import { useGame } from "@/context/GameContext";
import type { Match, Player } from "@/types/match";

vi.mock("@/context/GameContext", () => ({
  useGame: vi.fn(),
}));

const mockUseGame = useGame as ReturnType<typeof vi.fn>;

const playerAlice: Player = { id: "player-1", name: "Alice", templateId: "template-1", status: "alive" };
const playerBob: Player = { id: "player-2", name: "Bob", status: "alive" };
const playerDead: Player = { id: "player-3", name: "Charlie", status: "dead" };

const templateWithAllAbilities = {
  id: "template-1",
  name: "Hero",
  alignment: "hero" as const,
  abilities: [
    { id: "kill" },
    { id: "protect" },
    { id: "roleblock" },
    { id: "investigate" },
  ],
};

const templateWithKillOnly = {
  id: "template-2",
  name: "Villain",
  alignment: "villain" as const,
  abilities: [{ id: "kill" }],
};

describe("useAvailableAbilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupHook = (match: Match | null, playerId: string | null) => {
    mockUseGame.mockReturnValue({
      state: {
        match,
        playerId,
      },
      dispatch: vi.fn(),
      service: vi.fn(),
    });
    return renderHook(() => useAvailableAbilities());
  };

  describe("when match is null", () => {
    it("returns empty array", () => {
      const { result } = setupHook(null, "player-1");
      expect(result.current.availableAbilities).toEqual([]);
      expect(result.current.canUseAnyAbility).toBe(false);
    });
  });

  describe("when player is not in match", () => {
    it("returns empty array", () => {
      const match: Match = {
        id: "match-1",
        name: "Test",
        status: "started",
        phase: "action",
        players: [playerBob],
        templates: [templateWithAllAbilities],
        actions: [],
        createdAt: "2026-01-01",
        config: { showVotingTransparency: true },
      };
      const { result } = setupHook(match, "non-existent");
      expect(result.current.availableAbilities).toEqual([]);
    });
  });

  describe("when player is alive with no actions used", () => {
    it("returns all abilities as available", () => {
      const match: Match = {
        id: "match-1",
        name: "Test",
        status: "started",
        phase: "action",
        players: [playerAlice, playerBob, playerDead],
        templates: [templateWithAllAbilities],
        actions: [],
        createdAt: "2026-01-01",
        config: { showVotingTransparency: true },
      };
      const { result } = setupHook(match, "player-1");

      expect(result.current.availableAbilities).toHaveLength(4);
      expect(result.current.availableAbilities.every(a => a.isAvailable)).toBe(true);
      expect(result.current.canUseAnyAbility).toBe(true);
    });
  });

  describe("when ability already used this phase", () => {
    it("marks that ability as unavailable", () => {
      const match: Match = {
        id: "match-1",
        name: "Test",
        status: "started",
        phase: "action",
        players: [playerAlice, playerBob],
        templates: [templateWithAllAbilities],
        actions: [
          { id: "action-1", actorId: "player-1", targetIds: ["player-2"], effectType: "kill" },
        ],
        createdAt: "2026-01-01",
        config: { showVotingTransparency: true },
      };
      const { result } = setupHook(match, "player-1");

      const killAbility = result.current.availableAbilities.find(a => a.id === "kill");
      expect(killAbility?.isAvailable).toBe(false);
      expect(killAbility?.reason).toBe("Already used this phase");

      const protectAbility = result.current.availableAbilities.find(a => a.id === "protect");
      expect(protectAbility?.isAvailable).toBe(true);

      expect(result.current.canUseAnyAbility).toBe(true);
    });
  });

  describe("when player is dead", () => {
    const deadPlayer: Player = { id: "player-dead", name: "Dead", templateId: "template-1", status: "dead" };

    it("marks non-posthumous abilities as unavailable", () => {
      const match: Match = {
        id: "match-1",
        name: "Test",
        status: "started",
        phase: "action",
        players: [deadPlayer, playerBob],
        templates: [templateWithAllAbilities],
        actions: [],
        createdAt: "2026-01-01",
        config: { showVotingTransparency: true },
      };
      const { result } = setupHook(match, "player-dead");

      expect(result.current.availableAbilities.every(a => !a.isAvailable)).toBe(true);
      expect(result.current.availableAbilities[0].reason).toBe("Cannot use while dead");
      expect(result.current.canUseAnyAbility).toBe(false);
    });
  });

  describe("when only other players are dead", () => {
    it("kill is unavailable (no alive targets)", () => {
      const match: Match = {
        id: "match-1",
        name: "Test",
        status: "started",
        phase: "action",
        players: [playerAlice, playerDead],
        templates: [templateWithAllAbilities],
        actions: [],
        createdAt: "2026-01-01",
        config: { showVotingTransparency: true },
      };
      const { result } = setupHook(match, "player-1");

      const killAbility = result.current.availableAbilities.find(a => a.id === "kill");
      expect(killAbility?.isAvailable).toBe(false);
      expect(killAbility?.reason).toBe("No valid targets available");

      const protectAbility = result.current.availableAbilities.find(a => a.id === "protect");
      expect(protectAbility?.isAvailable).toBe(true);
    });

    it("protect is still available (can target self)", () => {
      const match: Match = {
        id: "match-1",
        name: "Test",
        status: "started",
        phase: "action",
        players: [playerAlice, playerDead],
        templates: [templateWithAllAbilities],
        actions: [],
        createdAt: "2026-01-01",
        config: { showVotingTransparency: true },
      };
      const { result } = setupHook(match, "player-1");

      const protectAbility = result.current.availableAbilities.find(a => a.id === "protect");
      expect(protectAbility?.isAvailable).toBe(true);
    });
  });

  describe("when player is the only alive player", () => {
    it("only protect is available (can target self)", () => {
      const onlyPlayer: Player = { id: "player-1", name: "Alice", templateId: "template-1", status: "alive" };
      const match: Match = {
        id: "match-1",
        name: "Test",
        status: "started",
        phase: "action",
        players: [onlyPlayer],
        templates: [templateWithAllAbilities],
        actions: [],
        createdAt: "2026-01-01",
        config: { showVotingTransparency: true },
      };
      const { result } = setupHook(match, "player-1");

      const protectAbility = result.current.availableAbilities.find(a => a.id === "protect");
      expect(protectAbility?.isAvailable).toBe(true);

      const killAbility = result.current.availableAbilities.find(a => a.id === "kill");
      expect(killAbility?.isAvailable).toBe(false);
      expect(killAbility?.reason).toBe("No valid targets available");
    });
  });

  describe("template-specific abilities", () => {
    it("only returns abilities from player's template", () => {
      const playerWithLimitedTemplate: Player = { 
        id: "player-limited", 
        name: "Villain", 
        templateId: "template-2", 
        status: "alive" 
      };
      const match: Match = {
        id: "match-1",
        name: "Test",
        status: "started",
        phase: "action",
        players: [playerWithLimitedTemplate, playerBob],
        templates: [templateWithAllAbilities, templateWithKillOnly],
        actions: [],
        createdAt: "2026-01-01",
        config: { showVotingTransparency: true },
      };
      const { result } = setupHook(match, "player-limited");

      expect(result.current.availableAbilities).toHaveLength(1);
      expect(result.current.availableAbilities[0].id).toBe("kill");
    });
  });
});
