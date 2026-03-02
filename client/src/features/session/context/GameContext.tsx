import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { Match } from '../../../types/game';
import { api } from '../../../services/api';
import { GAME_ACTIONS } from './gameActions';

interface TemplateConfig {
  name: string;
  alignment: 'hero' | 'villain' | 'neutral';
  abilities: string[];
}

interface GameState {
  matchId: string | null;
  playerId: string | null;
  playerName: string | null;
  isHost: boolean;
  match: Match | null;
  selectedAbility: string | null;
  selectedTarget: string | null;
  selectedVote: string | null;
  configuredTemplates: TemplateConfig[];
}

type GameAction =
  | { type: typeof GAME_ACTIONS.SET_MATCH; payload: { matchId: string; playerId: string; playerName: string; isHost: boolean; match: Match } }
  | { type: typeof GAME_ACTIONS.UPDATE_MATCH; payload: Match }
  | { type: typeof GAME_ACTIONS.SET_PHASE; payload: string }
  | { type: typeof GAME_ACTIONS.SET_PLAYERS; payload: Match['players'] }
  | { type: typeof GAME_ACTIONS.SELECT_ABILITY; payload: string | null }
  | { type: typeof GAME_ACTIONS.SELECT_TARGET; payload: string | null }
  | { type: typeof GAME_ACTIONS.SELECT_VOTE; payload: string | null }
  | { type: typeof GAME_ACTIONS.SET_TEMPLATES; payload: TemplateConfig[] }
  | { type: typeof GAME_ACTIONS.ADD_TEMPLATE; payload: TemplateConfig }
  | { type: typeof GAME_ACTIONS.UPDATE_TEMPLATE; payload: { index: number; template: TemplateConfig } }
  | { type: typeof GAME_ACTIONS.REMOVE_TEMPLATE; payload: number }
  | { type: typeof GAME_ACTIONS.RESET };

const initialState: GameState = {
  matchId: null,
  playerId: null,
  playerName: null,
  isHost: false,
  match: null,
  selectedAbility: null,
  selectedTarget: null,
  selectedVote: null,
  configuredTemplates: [],
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case GAME_ACTIONS.SET_MATCH:
      return {
        ...state,
        matchId: action.payload.matchId,
        playerId: action.payload.playerId,
        playerName: action.payload.playerName,
        isHost: action.payload.isHost,
        match: action.payload.match,
      };
    case GAME_ACTIONS.UPDATE_MATCH:
      return { ...state, match: action.payload };
    case GAME_ACTIONS.SET_PHASE:
      if (!state.match) return state;
      return { ...state, match: { ...state.match, phase: action.payload as Match['phase'] } };
    case GAME_ACTIONS.SET_PLAYERS:
      if (!state.match) return state;
      return { ...state, match: { ...state.match, players: action.payload } };
    case GAME_ACTIONS.SELECT_ABILITY:
      return { ...state, selectedAbility: action.payload, selectedTarget: null };
    case GAME_ACTIONS.SELECT_TARGET:
      return { ...state, selectedTarget: action.payload };
    case GAME_ACTIONS.SELECT_VOTE:
      return { ...state, selectedVote: action.payload };
    case GAME_ACTIONS.SET_TEMPLATES:
      return { ...state, configuredTemplates: action.payload };
    case GAME_ACTIONS.ADD_TEMPLATE:
      return { ...state, configuredTemplates: [...state.configuredTemplates, action.payload] };
    case GAME_ACTIONS.UPDATE_TEMPLATE:
      const templates = [...state.configuredTemplates];
      templates[action.payload.index] = action.payload.template;
      return { ...state, configuredTemplates: templates };
    case GAME_ACTIONS.REMOVE_TEMPLATE:
      return {
        ...state,
        configuredTemplates: state.configuredTemplates.filter((_, i) => i !== action.payload),
      };
    case GAME_ACTIONS.RESET:
      return initialState;
    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  createMatch: (name: string) => Promise<void>;
  joinMatch: (matchId: string, name: string) => Promise<void>;
  startMatch: () => Promise<void>;
  useAbility: (abilityId: string, targetId: string) => Promise<void>;
  castVote: (targetId: string) => Promise<void>;
  fetchMatch: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const createMatch = useCallback(async (name: string) => {
    const created = await api.createMatch(name);
    const joined = await api.joinMatch(created.id, name);
    const player = joined.players.find((p: { name: string }) => p.name === name);
    dispatch({
      type: GAME_ACTIONS.SET_MATCH,
      payload: {
        matchId: joined.id,
        playerId: player.id,
        playerName: name,
        isHost: true,
        match: joined,
      },
    });
  }, []);

  const joinMatch = useCallback(async (matchId: string, name: string) => {
    const joined = await api.joinMatch(matchId, name);
    const player = joined.players.find((p: { name: string }) => p.name === name);
    dispatch({
      type: GAME_ACTIONS.SET_MATCH,
      payload: {
        matchId: joined.id,
        playerId: player.id,
        playerName: name,
        isHost: false,
        match: joined,
      },
    });
  }, []);

  const startMatch = useCallback(async () => {
    if (!state.matchId || state.configuredTemplates.length === 0) return;
    const templates = state.configuredTemplates.map(t => ({
      name: t.name || undefined,
      alignment: t.alignment,
      abilities: t.abilities.map(id => ({ id })),
    }));
    const match = await api.startMatch(state.matchId, templates);
    dispatch({ type: GAME_ACTIONS.UPDATE_MATCH, payload: match });
  }, [state.matchId, state.configuredTemplates]);

  const useAbility = useCallback(async (abilityId: string, targetId: string) => {
    if (!state.matchId || !state.playerId) return;
    await api.useAbility(state.matchId, state.playerId, abilityId, [targetId]);
    dispatch({ type: GAME_ACTIONS.SELECT_ABILITY, payload: null });
    dispatch({ type: GAME_ACTIONS.SELECT_TARGET, payload: null });
  }, [state.matchId, state.playerId]);

  const castVote = useCallback(async () => {
    if (!state.matchId) return;
    await api.advancePhase(state.matchId);
    dispatch({ type: GAME_ACTIONS.SELECT_VOTE, payload: null });
  }, [state.matchId]);

  const fetchMatch = useCallback(async () => {
    if (!state.matchId) return;
    const match = await api.getMatch(state.matchId);
    dispatch({ type: GAME_ACTIONS.UPDATE_MATCH, payload: match });
  }, [state.matchId]);

  return (
    <GameContext.Provider value={{
      state,
      dispatch,
      createMatch,
      joinMatch,
      startMatch,
      useAbility,
      castVote,
      fetchMatch,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
