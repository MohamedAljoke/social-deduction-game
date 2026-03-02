import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../session/context/GameContext';
import { socketService } from '../../../services/socket';
import { GAME_ACTIONS } from '../../session/context/gameActions';
import type { ServerEvent } from '../../../types/events';
import type { Match } from '../../../types/game';

export function useLobbySocket() {
  const navigate = useNavigate();
  const { state, dispatch, fetchMatch } = useGame();

  useEffect(() => {
    const handleEvent = async (event: ServerEvent) => {
      switch (event.type) {
        case 'player_joined':
        case 'player_left':
          await fetchMatch();
          break;
        case 'match_started':
        case 'match_updated':
          if (event.type === 'match_updated') {
            dispatch({ type: GAME_ACTIONS.UPDATE_MATCH, payload: event.state as Match });
          }
          navigate('/game');
          break;
      }
    };

    const unsubscribe = socketService.subscribe(handleEvent);
    return () => {
      unsubscribe();
    };
  }, [fetchMatch, dispatch, navigate]);
}
