import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../session/context/GameContext';
import { socketService } from '../../../services/socket';
import { GAME_ACTIONS } from '../../session/context/gameActions';
import type { ServerEvent } from '../../../types/events';
import type { Match } from '../../../types/game';

export function useGameSocket() {
  const navigate = useNavigate();
  const { dispatch } = useGame();

  useEffect(() => {
    const handleEvent = (event: ServerEvent) => {
      switch (event.type) {
        case 'match_updated':
          dispatch({ type: GAME_ACTIONS.UPDATE_MATCH, payload: event.state as Match });
          break;
        case 'phase_changed':
          dispatch({ type: GAME_ACTIONS.SET_PHASE, payload: event.phase });
          break;
        case 'match_ended':
          navigate('/end');
          break;
      }
    };

    const unsubscribe = socketService.subscribe(handleEvent);
    return () => {
      unsubscribe();
    };
  }, [dispatch, navigate]);
}
