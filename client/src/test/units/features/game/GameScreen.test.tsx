import { screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { GameScreen } from "@/features/game/GameScreen";
import { t } from "@/infrastructure/i18n/translations";
import type { Match } from "@/types/match";

vi.mock("@/context/GameContext", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/features/game/components/AbilitySelector", () => ({
  AbilitySelector: () => <div data-testid="ability-selector" />,
}));

vi.mock("@/features/game/hooks", () => ({
  useGameActions: vi.fn(),
  useGamePlayer: vi.fn(),
  useGameLog: vi.fn(),
  useAvailableAbilities: vi.fn(),
  PLAYER_COLORS: ["#667eea", "#f093fb"],
}));

import { useGame } from "@/context/GameContext";
import {
  useAvailableAbilities,
  useGameActions,
  useGameLog,
  useGamePlayer,
} from "@/features/game/hooks";

const mockUseGame = vi.mocked(useGame);
const mockUseGameActions = vi.mocked(useGameActions);
const mockUseGamePlayer = vi.mocked(useGamePlayer);
const mockUseGameLog = vi.mocked(useGameLog);
const mockUseAvailableAbilities = vi.mocked(useAvailableAbilities);

const match: Match = {
  id: "match-1",
  name: "Test Match",
  status: "started",
  phase: "voting",
  players: [
    { id: "player-1", name: "Alice", status: "alive" },
    { id: "player-2", name: "Bob", status: "alive" },
  ],
  templates: [],
  actions: [],
  votes: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  config: { showVotingTransparency: true, aiGameMasterEnabled: false },
};

describe("GameScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGame.mockReturnValue({
      service: { leave: vi.fn() },
      state: {
        matchId: "match-1",
        investigateResult: null,
      },
    } as never);

    mockUseGamePlayer.mockReturnValue({
      match,
      playerId: "player-1",
      currentPlayer: match.players[0],
      currentTemplate: null,
      phaseConfig: { title: "Voting", description: "Vote to eliminate a player" },
      isHost: true,
    });

    mockUseGameLog.mockReturnValue({ actions: [] });
    mockUseAvailableAbilities.mockReturnValue({
      availableAbilities: [],
      canUseAnyAbility: false,
    });
  });

  it("disables vote actions and shows loading text while a cast vote request is pending", () => {
    mockUseGameActions.mockReturnValue({
      selectedAbility: null,
      selectedTarget: null,
      selectedVote: "player-2",
      isVoteSubmitting: true,
      pendingVoteAction: "cast",
      isAdvancingPhase: false,
      handleAbilityClick: vi.fn(),
      handleTargetClick: vi.fn(),
      handleConfirm: vi.fn(),
      handleSkipVote: vi.fn(),
      handleAdvancePhase: vi.fn(),
      handleCancelAbility: vi.fn(),
    });

    renderWithProviders(<GameScreen />);

    expect(
      screen.getByRole("button", { name: t("game.castingVote") }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: t("game.skipVote") }),
    ).toBeDisabled();
  });

  it("disables vote actions and shows loading text while a skip vote request is pending", () => {
    mockUseGameActions.mockReturnValue({
      selectedAbility: null,
      selectedTarget: null,
      selectedVote: "player-2",
      isVoteSubmitting: true,
      pendingVoteAction: "skip",
      isAdvancingPhase: false,
      handleAbilityClick: vi.fn(),
      handleTargetClick: vi.fn(),
      handleConfirm: vi.fn(),
      handleSkipVote: vi.fn(),
      handleAdvancePhase: vi.fn(),
      handleCancelAbility: vi.fn(),
    });

    renderWithProviders(<GameScreen />);

    expect(
      screen.getByRole("button", { name: t("game.castVote") }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: t("game.skippingVote") }),
    ).toBeDisabled();
  });

  it("keeps cast vote disabled when no vote is selected", () => {
    mockUseGameActions.mockReturnValue({
      selectedAbility: null,
      selectedTarget: null,
      selectedVote: null,
      isVoteSubmitting: false,
      pendingVoteAction: null,
      isAdvancingPhase: false,
      handleAbilityClick: vi.fn(),
      handleTargetClick: vi.fn(),
      handleConfirm: vi.fn(),
      handleSkipVote: vi.fn(),
      handleAdvancePhase: vi.fn(),
      handleCancelAbility: vi.fn(),
    });

    renderWithProviders(<GameScreen />);

    expect(
      screen.getByRole("button", { name: t("game.castVote") }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: t("game.skipVote") }),
    ).toBeEnabled();
  });

  it("disables next phase and shows loading text while phase advance is pending", () => {
    mockUseGameActions.mockReturnValue({
      selectedAbility: null,
      selectedTarget: null,
      selectedVote: null,
      isVoteSubmitting: false,
      pendingVoteAction: null,
      isAdvancingPhase: true,
      handleAbilityClick: vi.fn(),
      handleTargetClick: vi.fn(),
      handleConfirm: vi.fn(),
      handleSkipVote: vi.fn(),
      handleAdvancePhase: vi.fn(),
      handleCancelAbility: vi.fn(),
    });

    renderWithProviders(<GameScreen />);

    expect(
      screen.getByRole("button", { name: t("game.advancing") }),
    ).toBeDisabled();
  });
});
