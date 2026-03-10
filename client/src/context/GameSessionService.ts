import type { Dispatch } from "react";
import type { GameGateway } from "../infrastructure/ws/GameGateway";
import type { ApiClient } from "../infrastructure/http/ApiClient";
import type { GameAction } from "./GameContext";
import { GAME_ACTIONS } from "../types/gameActions";
import type { TemplateInput } from "../types/match";

export class GameSessionService {
  private gateway: GameGateway;
  private api: ApiClient;
  private dispatch: Dispatch<GameAction>;
  private navigate: (path: string) => void;
  private cleanups: Array<() => void> = [];
  private currentMatchId: string | null = null;
  private currentPlayerId: string | null = null;

  constructor(
    gateway: GameGateway,
    api: ApiClient,
    dispatch: Dispatch<GameAction>,
    navigate: (path: string) => void,
  ) {
    this.gateway = gateway;
    this.api = api;
    this.dispatch = dispatch;
    this.navigate = navigate;
  }

  connect(
    matchId: string,
    playerId: string,
    player?: { name: string; isHost: boolean },
  ): void {
    this.currentMatchId = matchId;
    this.currentPlayerId = playerId;

    const offConnected = this.gateway.onConnected(() => {
      this.gateway.joinMatch(
        matchId,
        playerId,
        player ? { id: playerId, ...player } : undefined,
      );
      offConnected();
    });

    this.cleanups.push(
      offConnected,
      this.gateway.onMatchUpdated((_matchId, state) => {
        this.dispatch({ type: GAME_ACTIONS.UPDATE_MATCH, payload: state });
      }),
      this.gateway.onPhaseChanged((_matchId, phase) => {
        this.dispatch({ type: GAME_ACTIONS.SET_PHASE, payload: phase });
      }),
      this.gateway.onPlayerJoined((_matchId, player) => {
        this.dispatch({ type: GAME_ACTIONS.ADD_PLAYER, payload: player });
      }),
      this.gateway.onPlayerLeft((_matchId, playerId) => {
        this.dispatch({ type: GAME_ACTIONS.REMOVE_PLAYER, payload: playerId });
      }),
      this.gateway.onPlayersSynced((_matchId, players) => {
        players.forEach((player) => {
          this.dispatch({ type: GAME_ACTIONS.ADD_PLAYER, payload: player });
        });
      }),
      this.gateway.onMatchStarted(() => {
        // Navigation is handled reactively by MatchRoute when match_updated
        // arrives with status="started", avoiding a race where navigate("/game")
        // fires before the match state is updated.
      }),
      this.gateway.onMatchEnded((matchId) => {
        void this.fetchMatch(matchId);
      }),
      this.gateway.onInvestigateResult((actorId, targetId, alignment) => {
        if (actorId !== this.currentPlayerId) return;
        this.dispatch({
          type: GAME_ACTIONS.SET_INVESTIGATE_RESULT,
          payload: { targetId, alignment },
        });
      }),
      this.gateway.onError((code, message) => {
        console.error(`WS error [${code}]: ${message}`);
      }),
    );

    this.gateway.connect();
  }

  disconnect(matchId?: string, playerId?: string): void {
    if (matchId && playerId) {
      this.gateway.leaveMatch(matchId, playerId);
    }
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.currentMatchId = null;
    this.currentPlayerId = null;
    this.gateway.disconnect();
  }

  async createMatch(
    name: string,
    config?: { showVotingTransparency?: boolean },
  ): Promise<void> {
    const created = await this.api.createMatch({ name, config });
    const joined = await this.api.joinMatch(created.id, name);
    const player = joined.players.find((p) => p.name === name);
    if (!player) throw new Error("Player not found after join");
    this.dispatch({
      type: GAME_ACTIONS.SET_MATCH,
      payload: {
        matchId: joined.id,
        playerId: player.id,
        playerName: name,
        isHost: true,
        match: joined,
      },
    });
  }

  async joinMatch(matchId: string, name: string): Promise<void> {
    const joined = await this.api.joinMatch(matchId, name);
    const player = joined.players.find((p) => p.name === name);
    if (!player) throw new Error("Player not found after join");
    this.dispatch({
      type: GAME_ACTIONS.SET_MATCH,
      payload: {
        matchId: joined.id,
        playerId: player.id,
        playerName: name,
        isHost: false,
        match: joined,
      },
    });
  }

  async startMatch(matchId: string, templates: TemplateInput[]): Promise<void> {
    const match = await this.api.startMatch(matchId, templates);
    this.dispatch({ type: GAME_ACTIONS.UPDATE_MATCH, payload: match });
  }

  async useAbility(
    matchId: string,
    playerId: string,
    EffectType: string,
    targetId: string,
  ): Promise<void> {
    await this.api.useAbility(matchId, playerId, EffectType, [targetId]);
    this.dispatch({ type: GAME_ACTIONS.SELECT_ABILITY, payload: null });
    this.dispatch({ type: GAME_ACTIONS.SELECT_TARGET, payload: null });
  }

  async castVote(
    matchId: string,
    playerId: string,
    targetId: string | null,
  ): Promise<void> {
    const match = await this.api.submitVote(matchId, playerId, targetId);
    this.dispatch({ type: GAME_ACTIONS.UPDATE_MATCH, payload: match });
    this.dispatch({ type: GAME_ACTIONS.SELECT_VOTE, payload: null });
  }

  async advancePhase(matchId: string): Promise<void> {
    await this.api.advancePhase(matchId);
  }

  leave(): void {
    if (this.currentMatchId && this.currentPlayerId) {
      this.disconnect(this.currentMatchId, this.currentPlayerId);
    }
    this.dispatch({ type: GAME_ACTIONS.RESET });
    this.navigate("/");
  }

  async fetchMatch(matchId?: string): Promise<void> {
    const id = matchId ?? this.currentMatchId;
    if (!id) return;
    const match = await this.api.getMatch(id);
    this.dispatch({ type: GAME_ACTIONS.UPDATE_MATCH, payload: match });
  }
}
