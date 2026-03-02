import { useCallback } from 'react';
import { useGame } from '../../session/context/GameContext';
import { GAME_ACTIONS } from '../../session/context/gameActions';

export function useGameActions() {
  const { state, dispatch, useAbility, castVote } = useGame();
  const { selectedAbility, selectedTarget, selectedVote } = state;

  const handleAbilityClick = useCallback((abilityId: string) => {
    dispatch({ 
      type: GAME_ACTIONS.SELECT_ABILITY, 
      payload: selectedAbility === abilityId ? null : abilityId 
    });
  }, [dispatch, selectedAbility]);

  const handleTargetClick = useCallback((targetId: string) => {
    const match = state.match;
    if (!match) return;

    if (match.phase === 'action' && selectedAbility) {
      dispatch({ type: GAME_ACTIONS.SELECT_TARGET, payload: targetId });
    } else if (match.phase === 'voting') {
      dispatch({ type: GAME_ACTIONS.SELECT_VOTE, payload: targetId });
    }
  }, [dispatch, state.match, selectedAbility]);

  const handleConfirm = useCallback(async () => {
    if (selectedAbility && selectedTarget) {
      await useAbility(selectedAbility, selectedTarget);
    } else if (selectedVote) {
      await castVote(selectedVote);
    }
  }, [selectedAbility, selectedTarget, selectedVote, useAbility, castVote]);

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
