import { renderWithProviders } from "@/test/test-utils";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";

import { LobbyScreen } from "@/features/lobby/LobbyScreen";
import type { Match } from "@/types/match";

const mockLeave = vi.fn();

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({ service: { leave: mockLeave } }),
}));

const baseMatch: Match = {
  id: "abc123",
  name: "Test Match",
  status: "lobby",
  phase: "discussion",
  players: [],
  templates: [],
  actions: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  config: { showVotingTransparency: true, aiGameMasterEnabled: false },
};

vi.mock("@/features/lobby/hooks", () => ({
  useLobby: vi.fn(),
}));

import { useLobby } from "@/features/lobby/hooks";
const mockUseLobby = vi.mocked(useLobby);

describe("LobbyScreen — player list", () => {
  it("shows Loading when match is null", () => {
    mockUseLobby.mockReturnValue({
      match: null,
      isHost: false,
      loading: false,
      handleStartGame: vi.fn(),
      refreshMatch: vi.fn(),
    });

    renderWithProviders(<LobbyScreen />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders all players from match state", () => {
    mockUseLobby.mockReturnValue({
      match: {
        ...baseMatch,
        players: [
          { id: "p1", name: "Alice", status: "alive" },
          { id: "p2", name: "Bob", status: "alive" },
        ],
      },
      isHost: false,
      loading: false,
      handleStartGame: vi.fn(),
      refreshMatch: vi.fn(),
    });

    renderWithProviders(<LobbyScreen />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // player count
  });

  it("shows updated list when a player is added", () => {
    mockUseLobby.mockReturnValue({
      match: {
        ...baseMatch,
        players: [{ id: "p1", name: "Alice", status: "alive" }],
      },
      isHost: false,
      loading: false,
      handleStartGame: vi.fn(),
      refreshMatch: vi.fn(),
    });

    const { rerender } = renderWithProviders(<LobbyScreen />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();

    mockUseLobby.mockReturnValue({
      match: {
        ...baseMatch,
        players: [
          { id: "p1", name: "Alice", status: "alive" },
          { id: "p2", name: "Bob", status: "alive" },
        ],
      },
      isHost: false,
      loading: false,
      handleStartGame: vi.fn(),
      refreshMatch: vi.fn(),
    });

    rerender(<LobbyScreen />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("removes player from the list when they leave", () => {
    mockUseLobby.mockReturnValue({
      match: {
        ...baseMatch,
        players: [
          { id: "p1", name: "Alice", status: "alive" },
          { id: "p2", name: "Bob", status: "alive" },
        ],
      },
      isHost: false,
      loading: false,
      handleStartGame: vi.fn(),
      refreshMatch: vi.fn(),
    });

    const { rerender } = renderWithProviders(<LobbyScreen />);
    expect(screen.getByText("Bob")).toBeInTheDocument();

    mockUseLobby.mockReturnValue({
      match: {
        ...baseMatch,
        players: [{ id: "p1", name: "Alice", status: "alive" }],
      },
      isHost: false,
      loading: false,
      handleStartGame: vi.fn(),
      refreshMatch: vi.fn(),
    });

    rerender(<LobbyScreen />);
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
