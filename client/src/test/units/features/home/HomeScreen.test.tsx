import { renderWithProviders, mockNavigate } from "@/test/test-utils"; // IMPORTANT: import helper FIRST
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HomeScreen } from "@/features/home/HomeScreen";
import { t } from "@/infrastructure/i18n/translations";

const mockCreateMatch = vi.fn();
const mockJoinMatch = vi.fn();

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    service: {
      createMatch: mockCreateMatch,
      joinMatch: mockJoinMatch,
    },
  }),
}));

describe("HomeScreen integration", () => {
  beforeEach(() => {
    mockCreateMatch.mockReset();
    mockJoinMatch.mockReset();
    mockNavigate.mockReset();
  });

  it("renders create mode by default", () => {
    renderWithProviders(<HomeScreen />);

    expect(screen.getByText(t("home.createGameBtn"))).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: t("home.createBtn") }),
    ).toBeInTheDocument();
  });

  it("toggles to join mode", async () => {
    renderWithProviders(<HomeScreen />);

    await userEvent.click(
      screen.getByRole("button", { name: t("home.joinGameTitle") }),
    );

    expect(screen.getByText(t("home.enterGameDetails"))).toBeInTheDocument();
  });

  it("creates a match and navigates to lobby", async () => {
    mockCreateMatch.mockResolvedValue(undefined);

    renderWithProviders(<HomeScreen />);

    await userEvent.type(screen.getByLabelText(t("home.yourName")), "Mohamed");

    await userEvent.click(screen.getByRole("button", { name: t("home.createBtn") }));

    await waitFor(() => {
      expect(mockCreateMatch).toHaveBeenCalledWith("Mohamed", {
        showVotingTransparency: true,
        aiGameMasterEnabled: false,
      });
      expect(mockNavigate).toHaveBeenCalledWith("/lobby");
    });
  });

  it("creates a match with AI enabled when toggled on", async () => {
    mockCreateMatch.mockResolvedValue(undefined);

    renderWithProviders(<HomeScreen />);

    await userEvent.type(screen.getByLabelText(t("home.yourName")), "Mohamed");
    await userEvent.click(screen.getByLabelText(t("home.aiGameMaster")));
    await userEvent.click(screen.getByRole("button", { name: t("home.createBtn") }));

    await waitFor(() => {
      expect(mockCreateMatch).toHaveBeenCalledWith("Mohamed", {
        showVotingTransparency: true,
        aiGameMasterEnabled: true,
      });
    });
  });

  it("shows error when create fails", async () => {
    mockCreateMatch.mockRejectedValue(new Error("fail"));

    renderWithProviders(<HomeScreen />);

    await userEvent.type(screen.getByLabelText(t("home.yourName")), "Mohamed");

    await userEvent.click(screen.getByRole("button", { name: t("home.createBtn") }));

    await waitFor(() => {
      expect(screen.getByText(t("errors.failedCreateGame"))).toBeInTheDocument();
    });
  });

  it("joins a match successfully", async () => {
    mockJoinMatch.mockResolvedValue(undefined);

    renderWithProviders(<HomeScreen />);

    await userEvent.click(
      screen.getByRole("button", {
        name: t("home.joinGameTitle"),
      }),
    );

    await userEvent.type(screen.getByLabelText(t("home.yourName")), "Mohamed");

    await userEvent.type(screen.getByLabelText(t("home.matchId")), "ABC123");

    await userEvent.click(screen.getByRole("button", { name: t("home.joinBtn") }));

    await waitFor(() => {
      expect(mockJoinMatch).toHaveBeenCalledWith("ABC123", "Mohamed");
      expect(mockNavigate).toHaveBeenCalledWith("/lobby");
    });
  });
});
