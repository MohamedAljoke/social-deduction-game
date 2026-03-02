import { HomeScreen } from "@/features/home/HomeScreen";
import * as homeHook from "@/features/home/hooks/useHomeScreen";
import { render, screen } from "@testing-library/react";
import { describe, vi, it, expect } from "vitest";

// Mock the module
vi.mock("./hooks/useHomeScreen");

describe("HomeScreen", () => {
  it("renders error when error exists", () => {
    vi.spyOn(homeHook, "useHomeScreen").mockReturnValue({
      mode: "create",
      playerName: "",
      matchCode: "",
      loading: false,
      error: "Something went wrong",
      setPlayerName: vi.fn(),
      setMatchCode: vi.fn(),
      toggleMode: vi.fn(),
      submit: vi.fn(),
    });

    render(<HomeScreen />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
