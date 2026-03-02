import { useEffect, useCallback } from 'react';
import { socketService } from '../../../services/socket';
import type { ServerEvent } from '../../../types/events';

interface UseSocketOptions {
  matchId: string | null;
  playerId: string | null;
  onEvent?: (event: ServerEvent) => void;
}

export function useSocket({ matchId, playerId, onEvent }: UseSocketOptions) {
  useEffect(() => {
    if (!matchId || !playerId) return;

    socketService.connect(matchId, playerId);

    return () => {
      socketService.disconnect();
    };
  }, [matchId, playerId]);

  useEffect(() => {
    if (!onEvent) return;
    const unsubscribe = socketService.subscribe(onEvent);
    return () => { unsubscribe(); };
  }, [onEvent]);

  const send = useCallback((event: unknown) => {
    socketService.send(event);
  }, []);

  return { send };
}
