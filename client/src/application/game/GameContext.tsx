import React, { createContext, useContext, useReducer, useMemo, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { WebSocketClient } from "../../infrastructure/ws/WebSocketClient"
import { GameGateway } from "../../infrastructure/ws/GameGateway"
import { ApiClient } from "../../infrastructure/http/ApiClient"
import { GameSessionService } from "./GameSessionService"
import { GAME_ACTIONS } from "../../features/session/context/gameActions"
import type { Match } from "../../domain/match"

interface TemplateConfig {
  name: string
  alignment: "hero" | "villain" | "neutral"
  abilities: string[]
}

export interface GameState {
  matchId: string | null
  playerId: string | null
  playerName: string | null
  isHost: boolean
  match: Match | null
  selectedAbility: string | null
  selectedTarget: string | null
  selectedVote: string | null
  configuredTemplates: TemplateConfig[]
}

export type GameAction =
  | {
      type: typeof GAME_ACTIONS.SET_MATCH
      payload: {
        matchId: string
        playerId: string
        playerName: string
        isHost: boolean
        match: Match
      }
    }
  | { type: typeof GAME_ACTIONS.UPDATE_MATCH; payload: Match }
  | { type: typeof GAME_ACTIONS.SET_PHASE; payload: string }
  | { type: typeof GAME_ACTIONS.SET_PLAYERS; payload: Match["players"] }
  | { type: typeof GAME_ACTIONS.SELECT_ABILITY; payload: string | null }
  | { type: typeof GAME_ACTIONS.SELECT_TARGET; payload: string | null }
  | { type: typeof GAME_ACTIONS.SELECT_VOTE; payload: string | null }
  | { type: typeof GAME_ACTIONS.SET_TEMPLATES; payload: TemplateConfig[] }
  | { type: typeof GAME_ACTIONS.ADD_TEMPLATE; payload: TemplateConfig }
  | { type: typeof GAME_ACTIONS.UPDATE_TEMPLATE; payload: { index: number; template: TemplateConfig } }
  | { type: typeof GAME_ACTIONS.REMOVE_TEMPLATE; payload: number }
  | { type: typeof GAME_ACTIONS.RESET }

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
}

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
      }
    case GAME_ACTIONS.UPDATE_MATCH:
      return { ...state, match: action.payload }
    case GAME_ACTIONS.SET_PHASE:
      if (!state.match) return state
      return { ...state, match: { ...state.match, phase: action.payload as Match["phase"] } }
    case GAME_ACTIONS.SET_PLAYERS:
      if (!state.match) return state
      return { ...state, match: { ...state.match, players: action.payload } }
    case GAME_ACTIONS.SELECT_ABILITY:
      return { ...state, selectedAbility: action.payload, selectedTarget: null }
    case GAME_ACTIONS.SELECT_TARGET:
      return { ...state, selectedTarget: action.payload }
    case GAME_ACTIONS.SELECT_VOTE:
      return { ...state, selectedVote: action.payload }
    case GAME_ACTIONS.SET_TEMPLATES:
      return { ...state, configuredTemplates: action.payload }
    case GAME_ACTIONS.ADD_TEMPLATE:
      return { ...state, configuredTemplates: [...state.configuredTemplates, action.payload] }
    case GAME_ACTIONS.UPDATE_TEMPLATE: {
      const templates = [...state.configuredTemplates]
      templates[action.payload.index] = action.payload.template
      return { ...state, configuredTemplates: templates }
    }
    case GAME_ACTIONS.REMOVE_TEMPLATE:
      return {
        ...state,
        configuredTemplates: state.configuredTemplates.filter((_, i) => i !== action.payload),
      }
    case GAME_ACTIONS.RESET:
      return initialState
    default:
      return state
  }
}

interface GameContextValue {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  service: GameSessionService
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(gameReducer, initialState)

  // Stable ref so service callback always has current navigate
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  const service = useMemo(() => {
    const ws = new WebSocketClient()
    const gateway = new GameGateway(ws)
    const api = new ApiClient()
    return new GameSessionService(gateway, api, dispatch, (path) => navigateRef.current(path))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state.matchId && state.playerId) {
      service.connect(state.matchId, state.playerId)
      const matchId = state.matchId
      const playerId = state.playerId
      return () => service.disconnect(matchId, playerId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.matchId, state.playerId])

  return (
    <GameContext.Provider value={{ state, dispatch, service }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGameContext(): GameContextValue {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider")
  }
  return context
}

// Alias for backward compatibility
export const useGame = useGameContext
