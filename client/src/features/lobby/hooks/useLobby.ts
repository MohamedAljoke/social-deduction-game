import { useState, useCallback } from "react";
import { useGame } from "../../../context/GameContext";

export function useLobby() {
  const { state, service } = useGame();
  const [loading, setLoading] = useState(false);

  const handleStartGame = useCallback(async () => {
    if (!state.matchId) return;
    setLoading(true);
    try {
      await service.startMatch(state.matchId, []);
    } catch (err) {
      alert("Failed to start game");
    } finally {
      setLoading(false);
    }
  }, [state.matchId, service]);

  const refreshMatch = useCallback(async () => {
    await service.fetchMatch(state.matchId ?? undefined);
  }, [service, state.matchId]);

  return {
    match: state.match,
    isHost: state.isHost,
    loading,
    handleStartGame,
    refreshMatch,
  };
}
