import { renderWithProviders } from "@/test/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EndScreen } from "@/features/end/EndScreen";
import { t } from "@/infrastructure/i18n/translations";
import type { Match } from "@/types/match";

const mockRematch = vi.fn();
const mockLeave = vi.fn();

const baseMatch: Match = {
  id: "match-1",
  name: "Test Match",
  status: "finished",
  phase: "discussion",
  players: [
    { id: "player-1", name: "Alice", status: "alive", templateId: "template-1" },
    { id: "player-2", name: "Bob", status: "dead", templateId: "template-2" },
  ],
  templates: [
    { id: "template-1", name: "Guardian", alignment: "hero", abilities: [{ id: "protect" }], winCondition: "team_parity", winConditionConfig: null },
    { id: "template-2", name: "Assassin", alignment: "villain", abilities: [{ id: "kill" }], winCondition: "team_parity", winConditionConfig: null },
  ],
  actions: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  config: { showVotingTransparency: true, aiGameMasterEnabled: false },
  winner: { kind: "alignment", alignment: "hero" },
  winnerAlignment: "hero",
  endedAt: "2026-01-01T01:00:00.000Z",
};

const mockUseGame = vi.fn();

vi.mock("@/context/GameContext", () => ({
  useGame: () => mockUseGame(),
}));

describe("EndScreen", () => {
  beforeEach(() => {
    mockRematch.mockReset();
    mockLeave.mockReset();
  });

  it("lets the host trigger a rematch", async () => {
    mockRematch.mockResolvedValue(undefined);
    mockUseGame.mockReturnValue({
      state: { match: baseMatch, isHost: true },
      service: { rematch: mockRematch, leave: mockLeave },
    });

    renderWithProviders(<EndScreen />);

    await userEvent.click(screen.getByRole("button", { name: t("end.playAgain") }));

    await waitFor(() => {
      expect(mockRematch).toHaveBeenCalledWith("match-1");
    });
  });

  it("shows a waiting message for non-host players", () => {
    mockUseGame.mockReturnValue({
      state: { match: baseMatch, isHost: false },
      service: { rematch: mockRematch, leave: mockLeave },
    });

    renderWithProviders(<EndScreen />);

    expect(screen.getByText(t("end.waitingForHostRematch"))).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: t("end.playAgain") }),
    ).not.toBeInTheDocument();
  });
});
