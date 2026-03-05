import { renderWithProviders, mockNavigate } from "@/test/test-utils"; // IMPORTANT: import helper FIRST
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HomeScreen } from "@/features/home/HomeScreen";

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

    expect(screen.getByText("Create New Game")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create game/i }),
    ).toBeInTheDocument();
  });

  it("toggles to join mode", async () => {
    renderWithProviders(<HomeScreen />);

    await userEvent.click(
      screen.getByRole("button", { name: /join existing game/i }),
    );

    expect(screen.getByText(/enter game details/i)).toBeInTheDocument();
  });

  it("creates a match and navigates to lobby", async () => {
    mockCreateMatch.mockResolvedValue(undefined);

    renderWithProviders(<HomeScreen />);

    await userEvent.type(screen.getByLabelText(/your name/i), "Mohamed");

    await userEvent.click(screen.getByRole("button", { name: /create game/i }));

    await waitFor(() => {
      expect(mockCreateMatch).toHaveBeenCalledWith("Mohamed", {
        showVotingTransparency: true,
      });
      expect(mockNavigate).toHaveBeenCalledWith("/lobby");
    });
  });

  it("shows error when create fails", async () => {
    mockCreateMatch.mockRejectedValue(new Error("fail"));

    renderWithProviders(<HomeScreen />);

    await userEvent.type(screen.getByLabelText(/your name/i), "Mohamed");

    await userEvent.click(screen.getByRole("button", { name: /create game/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to create game/i)).toBeInTheDocument();
    });
  });

  it("joins a match successfully", async () => {
    mockJoinMatch.mockResolvedValue(undefined);

    renderWithProviders(<HomeScreen />);

    await userEvent.click(
      screen.getByRole("button", {
        name: /join existing game/i,
      }),
    );

    await userEvent.type(screen.getByLabelText(/your name/i), "Mohamed");

    await userEvent.type(screen.getByLabelText(/match id/i), "ABC123");

    await userEvent.click(screen.getByRole("button", { name: /join game/i }));

    await waitFor(() => {
      expect(mockJoinMatch).toHaveBeenCalledWith("ABC123", "Mohamed");
      expect(mockNavigate).toHaveBeenCalledWith("/lobby");
    });
  });
});
