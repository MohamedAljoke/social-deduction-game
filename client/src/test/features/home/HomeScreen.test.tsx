import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HomeScreen } from "@/features/home/HomeScreen";

const mockCreateMatch = vi.fn();
const mockJoinMatch = vi.fn();

vi.mock("@/features/session/context/GameContext", () => ({
  useGame: () => ({
    createMatch: mockCreateMatch,
    joinMatch: mockJoinMatch,
  }),
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <HomeScreen />
    </MemoryRouter>,
  );
}

describe("HomeScreen integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create mode by default", () => {
    renderWithRouter();

    expect(screen.getByText("Create New Game")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /create game/i }),
    ).toBeInTheDocument();
  });

  it("toggles to join mode", async () => {
    renderWithRouter();

    const toggleButton = screen.getByRole("button", {
      name: /join existing game/i,
    });

    await userEvent.click(toggleButton);

    expect(screen.getByText(/enter game details/i)).toBeInTheDocument();
  });

  it("creates a match and navigates to lobby", async () => {
    mockCreateMatch.mockResolvedValue(undefined);

    renderWithRouter();

    const nameInput = screen.getByLabelText(/your name/i);
    const submitButton = screen.getByRole("button", {
      name: /create game/i,
    });

    await userEvent.type(nameInput, "Mohamed");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateMatch).toHaveBeenCalledWith("Mohamed");
      expect(mockNavigate).toHaveBeenCalledWith("/lobby");
    });
  });

  it("shows error when create fails", async () => {
    mockCreateMatch.mockRejectedValue(new Error("fail"));

    renderWithRouter();

    const nameInput = screen.getByLabelText(/your name/i);
    const submitButton = screen.getByRole("button", {
      name: /create game/i,
    });

    await userEvent.type(nameInput, "Mohamed");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to create game/i)).toBeInTheDocument();
    });
  });

  it("joins a match successfully", async () => {
    mockJoinMatch.mockResolvedValue(undefined);

    renderWithRouter();

    // switch to join mode
    await userEvent.click(
      screen.getByRole("button", {
        name: /join existing game/i,
      }),
    );

    const nameInput = screen.getByLabelText(/your name/i);
    const matchInput = screen.getByLabelText(/match id/i);
    const submitButton = screen.getByRole("button", {
      name: /join game/i,
    });

    await userEvent.type(nameInput, "Mohamed");
    await userEvent.type(matchInput, "ABC123");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockJoinMatch).toHaveBeenCalledWith("ABC123", "Mohamed");
      expect(mockNavigate).toHaveBeenCalledWith("/lobby");
    });
  });
});
