import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../session/context/GameContext';
import { GAME_ACTIONS } from '../../session/context/gameActions';

export function useLobby() {
  const navigate = useNavigate();
  const { state, dispatch, startMatch, fetchMatch } = useGame();
  const [loading, setLoading] = useState(false);

  const handleStartGame = useCallback(async () => {
    if (!state.match) return;
    
    const playerCount = state.match.players.length;
    const templates = Array(playerCount).fill(null).map((_, i) => ({
      name: i === 0 ? 'Infiltrator' : 'Citizen',
      alignment: i === 0 ? 'villain' as const : 'hero' as const,
      abilities: i === 0 ? ['kill'] : ['investigate'],
    }));
    
    dispatch({ type: GAME_ACTIONS.SET_TEMPLATES, payload: templates });
    
    setLoading(true);
    try {
      await startMatch();
      navigate('/game');
    } catch (err) {
      alert('Failed to start game');
    } finally {
      setLoading(false);
    }
  }, [state.match, dispatch, startMatch, navigate]);

  const refreshMatch = useCallback(async () => {
    await fetchMatch();
  }, [fetchMatch]);

  return {
    match: state.match,
    isHost: state.isHost,
    loading,
    handleStartGame,
    refreshMatch,
  };
}
