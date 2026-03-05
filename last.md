date(client/src/context/GameContext.tsx)  
 ⎿ Added 1 line, removed 1 line  
 12 import { ApiClient } from "../infrastructure/http/ApiClient";  
 13 import { GameSessionService } from "./GameSessionService";  
 14 import { GAME_ACTIONS } from "../types/gameActions";  
 15 -import type { Match } from "../types/match";  
 15 +import type { Match, Player } from "../types/match";  
 16  
 17 interface TemplateConfig {  
 18 name: string;

● Update(client/src/context/GameContext.tsx)  
 ⎿ Added 2 lines  
 56 payload: { index: number; template: TemplateConfig };  
 57 }  
 58 | { type: typeof GAME_ACTIONS.REMOVE_TEMPLATE; payload: number }  
 59 + | { type: typeof GAME_ACTIONS.ADD_PLAYER; payload: Player }  
 60 + | { type: typeof GAME_ACTIONS.REMOVE_PLAYER; payload: string }  
 61 | { type: typeof GAME_ACTIONS.RESET };  
 62  
 63 const initialState: GameState = {

● Update(client/src/context/GameContext.tsx)
⎿ Added 6 lines
142 (\_, i) => i !== action.payload,  
 143 ),  
 144 };  
 145 + case GAME_ACTIONS.ADD_PLAYER:  
 146 + if (!state.match) return state;  
 147 + return { ...state, match: { ...state.match, players: [...state.match.players, action.payload] } };  
 148 + case GAME_ACTIONS.REMOVE_PLAYER:  
 149 + if (!state.match) return state;  
 150 + return { ...state, match: { ...state.match, players: state.match.players.filter(p => p.id !== action.payload) } };  
 151 case GAME_ACTIONS.RESET:
152 return initialState;
153 default:

● Update(client/src/context/GameSessionService.ts)
⎿ Added 4 lines, removed 4 lines
42 this.gateway.onPhaseChanged((\_matchId, phase) => {  
 43 this.dispatch({ type: GAME_ACTIONS.SET_PHASE, payload: phase });  
 44 }),  
 45 - this.gateway.onPlayerJoined(() => {  
 46 - void this.fetchMatch();  
 45 + this.gateway.onPlayerJoined((\_matchId, player) => {  
 46 + this.dispatch({ type: GAME_ACTIONS.ADD_PLAYER, payload: player });  
 47 }),
48 - this.gateway.onPlayerLeft(() => {  
 49 - void this.fetchMatch();  
 48 + this.gateway.onPlayerLeft((\_matchId, playerId) => {  
 49 + this.dispatch({ type: GAME_ACTIONS.REMOVE_PLAYER, payload: playerId });  
 50 }),
51 this.gateway.onMatchStarted(() => {
52 this.navigate("/game");

● Done. All three files updated:

- gameActions.ts — added ADD_PLAYER and REMOVE_PLAYER
- GameContext.tsx — imported Player, extended the union, added two reducer cases
- GameSessionService.ts — replaced both fetchMatch() calls with direct dispatches  


❯ make a test case for this where the player list should show new player etc

● Searched for 3 patterns, read 5 files (ctrl+o to expand)

● I need to export gameReducer to unit-test it. Then I'll write both reducer tests and a LobbyScreen component test.

● Update(client/src/context/GameContext.tsx)  
 ⎿ Added 1 line, removed 1 line  
 91 }  
 92 }  
 93  
 94 -function gameReducer(state: GameState, action: GameAction): GameState {  
 94 +export function gameReducer(state: GameState, action: GameAction): GameState {  
 95 switch (action.type) {  
 96 case GAME_ACTIONS.SET_MATCH:
97 return {

● Now create the reducer unit tests:

● Write(client/src/test/units/context/gameReducer.test.ts)  
 ⎿ Wrote 98 lines to client/src/test/units/context/gameReducer.test.ts
import { describe, it, expect } from "vitest";  
 import { gameReducer } from "@/context/GameContext";  
 import type { GameState } from "@/context/GameContext";  
 import { GAME_ACTIONS } from "@/types/gameActions";  
 import type { Match, Player } from "@/types/match";

     const baseMatch: Match = {
       id: "match-1",
       name: "Test Match",
       status: "lobby",
     … +88 lines (ctrl+o to expand)

● Now the LobbyScreen component test:

● Write(client/src/test/units/features/lobby/LobbyScreen.test.tsx)  
 ⎿ Wrote 136 lines to client/src/test/units/features/lobby/LobbyScreen.test.tsx
import { renderWithProviders } from "@/test/test-utils";  
 import { describe, it, expect, vi } from "vitest";  
 import { screen } from "@testing-library/react";

     import { LobbyScreen } from "@/features/lobby/LobbyScreen";
     import type { Match } from "@/types/match";

     const mockLeave = vi.fn();

     vi.mock("@/context/GameContext", () => ({
     … +126 lines (ctrl+o to expand)

⎿ You've hit your limit · resets 4am (America/Sao_Paulo)

✻ Cogitated for 1m 7s  

