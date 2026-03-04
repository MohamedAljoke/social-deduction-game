import { useCallback } from "react";
import { useGame } from "../../../context/GameContext";
import { GAME_ACTIONS } from "../../../types/gameActions";

export function useGameActions() {
  const { state, dispatch, service } = useGame();
  const { selectedAbility, selectedTarget, selectedVote } = state;

  const handleAbilityClick = useCallback(
    (abilityId: string) => {
      dispatch({
        type: GAME_ACTIONS.SELECT_ABILITY,
        payload: selectedAbility === abilityId ? null : abilityId,
      });
    },
    [dispatch, selectedAbility],
  );

  const handleTargetClick = useCallback(
    (targetId: string) => {
      const match = state.match;
      if (!match) return;

      if (match.phase === "action" && selectedAbility) {
        dispatch({ type: GAME_ACTIONS.SELECT_TARGET, payload: targetId });
      } else if (match.phase === "voting") {
        dispatch({ type: GAME_ACTIONS.SELECT_VOTE, payload: targetId });
      }
    },
    [dispatch, state.match, selectedAbility],
  );

  const handleConfirm = useCallback(async () => {
    if (!state.matchId || !state.playerId) return;
    if (selectedAbility && selectedTarget) {
      await service.useAbility(
        state.matchId,
        state.playerId,
        selectedAbility,
        selectedTarget,
      );
    } else if (selectedVote) {
      await service.castVote(state.matchId, state.playerId, selectedVote);
    }
  }, [
    selectedAbility,
    selectedTarget,
    selectedVote,
    service,
    state.matchId,
    state.playerId,
  ]);

  const handleCancelAbility = useCallback(() => {
    dispatch({ type: GAME_ACTIONS.SELECT_ABILITY, payload: null });
  }, [dispatch]);

  return {
    selectedAbility,
    selectedTarget,
    selectedVote,
    handleAbilityClick,
    handleTargetClick,
    handleConfirm,
    handleCancelAbility,
  };
}
