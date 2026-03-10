import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameActions } from "@/features/game/hooks/useGameActions";
import { useGame } from "@/context/GameContext";

vi.mock("@/context/GameContext", () => ({
  useGame: vi.fn(),
}));

const mockUseGame = vi.mocked(useGame);

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useGameActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents duplicate cast vote submissions and clears pending state on success", async () => {
    const request = deferred<void>();
    const castVote = vi.fn().mockReturnValue(request.promise);

    mockUseGame.mockReturnValue({
      state: {
        matchId: "match-1",
        playerId: "player-1",
        selectedAbility: null,
        selectedTarget: null,
        selectedVote: "player-2",
      },
      dispatch: vi.fn(),
      service: {
        castVote,
        advancePhase: vi.fn(),
        useAbility: vi.fn(),
      },
    } as never);

    const { result } = renderHook(() => useGameActions());

    let firstCall!: Promise<void>;
    let secondCall!: Promise<void>;

    await act(async () => {
      firstCall = result.current.handleConfirm();
      secondCall = result.current.handleConfirm();
    });

    expect(castVote).toHaveBeenCalledTimes(1);
    expect(result.current.isVoteSubmitting).toBe(true);
    expect(result.current.pendingVoteAction).toBe("cast");

    await act(async () => {
      request.resolve();
      await Promise.all([firstCall, secondCall]);
    });

    await waitFor(() => {
      expect(result.current.isVoteSubmitting).toBe(false);
      expect(result.current.pendingVoteAction).toBeNull();
    });
  });

  it("prevents duplicate skip vote submissions and clears pending state on failure", async () => {
    const request = deferred<void>();
    const castVote = vi.fn().mockReturnValue(request.promise);

    mockUseGame.mockReturnValue({
      state: {
        matchId: "match-1",
        playerId: "player-1",
        selectedAbility: null,
        selectedTarget: null,
        selectedVote: null,
      },
      dispatch: vi.fn(),
      service: {
        castVote,
        advancePhase: vi.fn(),
        useAbility: vi.fn(),
      },
    } as never);

    const { result } = renderHook(() => useGameActions());

    let firstCall!: Promise<void>;
    let secondCall!: Promise<void>;

    await act(async () => {
      firstCall = result.current.handleSkipVote();
      secondCall = result.current.handleSkipVote();
    });

    expect(castVote).toHaveBeenCalledTimes(1);
    expect(result.current.isVoteSubmitting).toBe(true);
    expect(result.current.pendingVoteAction).toBe("skip");

    await expect(
      act(async () => {
        request.reject(new Error("vote failed"));
        await Promise.allSettled([firstCall, secondCall]);
      }),
    ).resolves.toBeUndefined();

    await waitFor(() => {
      expect(result.current.isVoteSubmitting).toBe(false);
      expect(result.current.pendingVoteAction).toBeNull();
    });
  });

  it("prevents duplicate next phase submissions and clears pending state on failure", async () => {
    const request = deferred<void>();
    const advancePhase = vi.fn().mockReturnValue(request.promise);

    mockUseGame.mockReturnValue({
      state: {
        matchId: "match-1",
        playerId: "player-1",
        selectedAbility: null,
        selectedTarget: null,
        selectedVote: null,
      },
      dispatch: vi.fn(),
      service: {
        castVote: vi.fn(),
        advancePhase,
        useAbility: vi.fn(),
      },
    } as never);

    const { result } = renderHook(() => useGameActions());

    let firstCall!: Promise<void>;
    let secondCall!: Promise<void>;

    await act(async () => {
      firstCall = result.current.handleAdvancePhase();
      secondCall = result.current.handleAdvancePhase();
    });

    expect(advancePhase).toHaveBeenCalledTimes(1);
    expect(result.current.isAdvancingPhase).toBe(true);

    await expect(
      act(async () => {
        request.reject(new Error("phase failed"));
        await Promise.allSettled([firstCall, secondCall]);
      }),
    ).resolves.toBeUndefined();

    await waitFor(() => {
      expect(result.current.isAdvancingPhase).toBe(false);
    });
  });
});
