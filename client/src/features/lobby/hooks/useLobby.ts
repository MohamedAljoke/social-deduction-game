import { useState, useCallback } from "react";
import { useGame } from "../../../context/GameContext";
import { GAME_ACTIONS } from "../../../types/gameActions";

export function useLobby() {
  const { state, dispatch, service } = useGame();
  const [loading, setLoading] = useState(false);

  const handleStartGame = useCallback(async () => {
    if (!state.match || !state.matchId) return;

    const playerCount = state.match.players.length;
    const templates = Array(playerCount)
      .fill(null)
      .map((_, i) => ({
        name: i === 0 ? "Infiltrator" : "Citizen",
        alignment: i === 0 ? ("villain" as const) : ("hero" as const),
        abilities: [{ id: i === 0 ? "kill" : "investigate" }],
      }));

    dispatch({
      type: GAME_ACTIONS.SET_TEMPLATES,
      payload: templates.map((t) => ({
        ...t,
        abilities: t.abilities.map((a) => a.id),
      })),
    });

    setLoading(true);
    try {
      await service.startMatch(state.matchId, templates);
    } catch (err) {
      alert("Failed to start game");
    } finally {
      setLoading(false);
    }
  }, [state.match, state.matchId, dispatch, service]);

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
