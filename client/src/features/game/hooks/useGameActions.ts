import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "../../../context/GameContext";
import { GAME_ACTIONS } from "../../../types/gameActions";

export function useGameActions() {
  const { state, dispatch, service } = useGame();
  const { selectedAbility, selectedTarget, selectedVote } = state;
  const [pendingVoteAction, setPendingVoteAction] = useState<
    "cast" | "skip" | null
  >(null);
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false);
  const voteInFlightRef = useRef(false);
  const advanceInFlightRef = useRef(false);

  useEffect(() => {
    const match = state.match;
    if (!match || match.phase !== "voting" || !selectedVote) return;

    const selectedPlayer = match.players.find(
      (player) => player.id === selectedVote,
    );
    if (!selectedPlayer || selectedPlayer.status !== "alive") {
      dispatch({ type: GAME_ACTIONS.SELECT_VOTE, payload: null });
    }
  }, [dispatch, selectedVote, state.match]);

  const handleAbilityClick = useCallback(
    (EffectType: string) => {
      dispatch({
        type: GAME_ACTIONS.SELECT_ABILITY,
        payload: selectedAbility === EffectType ? null : EffectType,
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
        const target = match.players.find((player) => player.id === targetId);
        if (!target || target.status !== "alive") return;
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
      const selectedPlayer = state.match?.players.find(
        (player) => player.id === selectedVote,
      );
      if (!selectedPlayer || selectedPlayer.status !== "alive") {
        dispatch({ type: GAME_ACTIONS.SELECT_VOTE, payload: null });
        return;
      }

      if (voteInFlightRef.current) return;
      voteInFlightRef.current = true;
      setPendingVoteAction("cast");
      try {
        await service.castVote(state.matchId, state.playerId, selectedVote);
      } finally {
        voteInFlightRef.current = false;
        setPendingVoteAction(null);
      }
    }
  }, [
    selectedAbility,
    selectedTarget,
    selectedVote,
    service,
    state.matchId,
    state.playerId,
  ]);

  const handleSkipVote = useCallback(async () => {
    if (!state.matchId || !state.playerId) return;
    if (voteInFlightRef.current) return;
    voteInFlightRef.current = true;
    setPendingVoteAction("skip");
    try {
      await service.castVote(state.matchId, state.playerId, null);
    } finally {
      voteInFlightRef.current = false;
      setPendingVoteAction(null);
    }
  }, [service, state.matchId, state.playerId]);

  const handleAdvancePhase = useCallback(async () => {
    if (!state.matchId || advanceInFlightRef.current) return;
    advanceInFlightRef.current = true;
    setIsAdvancingPhase(true);
    try {
      await service.advancePhase(state.matchId);
    } finally {
      advanceInFlightRef.current = false;
      setIsAdvancingPhase(false);
    }
  }, [service, state.matchId]);

  const handleCancelAbility = useCallback(() => {
    dispatch({ type: GAME_ACTIONS.SELECT_ABILITY, payload: null });
  }, [dispatch]);

  return {
    selectedAbility,
    selectedTarget,
    selectedVote,
    isVoteSubmitting: pendingVoteAction !== null,
    pendingVoteAction,
    isAdvancingPhase,
    handleAbilityClick,
    handleTargetClick,
    handleConfirm,
    handleSkipVote,
    handleAdvancePhase,
    handleCancelAbility,
  };
}
