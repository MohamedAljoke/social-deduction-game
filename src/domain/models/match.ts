import {
  MatchAlreadyStarted,
  WrongPhaseError,
  InvalidTargetCount,
  CannotTargetSelf,
  PlayerIsDeadError,
  MissingTemplate,
  AbilityDoesNotBelongToUser,
} from "../errors";
import { Phase, PhaseType } from "./phase";
import { Player } from "./player";
import { AbilityId } from "./ability";
import { Action } from "./action";
import { Template } from "./template";
import { PlayerRoster } from "../services/PlayerRoster";
import { VoteTallier } from "../services/VoteTallier";
import { ActionResolver } from "../services/ActionResolver";
import { WinConditionEvaluator } from "../winConditions/WinConditionEvaluator";
import { WinResult, playerToSnapshot } from "../winConditions/IWinCondition";
import { VoteEliminatedWinCondition } from "../winConditions/VoteEliminatedWinCondition";
import { MajorityWinCondition } from "../winConditions/MajorityWinCondition";
import { ResolutionEvent } from "../resolution/ResolutionContext";
import { PhaseManager } from "../phase/PhaseManager";
import { MatchContext } from "../phase/MatchContext";

export enum MatchStatus {
  LOBBY = "lobby",
  STARTED = "started",
  FINISHED = "finished",
}

export class Match {
  private phase: Phase = new Phase();
  private status: MatchStatus;
  private jesterWinners: Set<string> = new Set();
  private endedByJesterWin: boolean = false;
  private lastWinResult: WinResult | null = null;

  private playerRoster: PlayerRoster;
  private voteTallier: VoteTallier;
  private actionResolver: ActionResolver;
  private winConditionEvaluator: WinConditionEvaluator;
  private phaseManager: PhaseManager;

  constructor() {
    this.playerRoster = new PlayerRoster();
    this.voteTallier = new VoteTallier(this.playerRoster);
    this.actionResolver = new ActionResolver(this.playerRoster);
    this.winConditionEvaluator = new WinConditionEvaluator([
      new VoteEliminatedWinCondition(),
      new MajorityWinCondition(),
    ]);
    this.status = MatchStatus.LOBBY;
    this.phaseManager = new PhaseManager();
    this.registerDefaultHooks();
  }

  private registerDefaultHooks(): void {
    this.phaseManager.registerOnLeave("voting", (ctx) => {
      ctx.tallyVotes();
      this.checkJesterWin(ctx);
    });

    this.phaseManager.registerOnEnter("resolution", (ctx) => {
      ctx.resolveActions();
      this.checkWinCondition(ctx);
    });
  }

  private checkJesterWin(ctx: MatchContext): void {
    const eliminated = ctx.getEliminatedThisRound();
    if (!eliminated) return;
    const player = ctx.getPlayerByID(eliminated);
    const template = player.getTemplate();
    if (template?.winCondition === "vote_eliminated") {
      this.jesterWinners.add(player.id);
      if (template.endsGameOnWin) {
        this.endedByJesterWin = true;
        this.status = MatchStatus.FINISHED;
      }
    }
  }

  private checkWinCondition(ctx: MatchContext): void {
    const players = this.playerRoster.getPlayers().map(playerToSnapshot);
    const eliminated = ctx.getEliminatedThisRound();
    const result = this.winConditionEvaluator.evaluate(
      players,
      eliminated ?? null,
      this.status,
    );

    if (result) {
      this.lastWinResult = result;
      if (result.endsGame) {
        this.status = MatchStatus.FINISHED;
      }
    }
  }

  getStatus() {
    return this.status;
  }

  getWinner(): "heroes" | "villains" | "draw" | "jester" | null {
    if (this.status !== MatchStatus.FINISHED) {
      return null;
    }

    if (this.endedByJesterWin) {
      return "jester";
    }

    if (this.lastWinResult) {
      return this.lastWinResult.winnerLabel;
    }

    return null;
  }

  public start(templates: Template[]): void {
    if (this.status !== MatchStatus.LOBBY) {
      throw new MatchAlreadyStarted();
    }

    this.playerRoster.assignTemplates(templates);
    this.status = MatchStatus.STARTED;
  }

  public submitAction(
    actorId: string,
    abilityId: AbilityId,
    targetIds: string[],
  ): void {
    this.ensurePhase("action");

    const player = this.playerRoster.getPlayerByID(actorId);
    const template = player.getTemplate();

    if (!template) {
      throw new MissingTemplate();
    }

    const ability = template.getAbility(abilityId);
    if (!ability) {
      throw new AbilityDoesNotBelongToUser();
    }

    if (targetIds.length !== ability.targetCount) {
      throw new InvalidTargetCount(ability.targetCount, targetIds.length);
    }

    for (const targetId of targetIds) {
      const target = this.playerRoster.getPlayerByID(targetId);
      if (ability.requiresAliveTarget && !target.isAlive()) {
        throw new PlayerIsDeadError();
      }
      if (!ability.canTargetSelf && targetId === actorId) {
        throw new CannotTargetSelf();
      }
    }

    const action = player.act(abilityId, targetIds);

    this.actionResolver.submitAction(action);
  }

  public submitVote(voterId: string, targetId: string): void {
    this.ensurePhase("voting");
    this.voteTallier.submitVote(voterId, targetId);
  }

  private ensurePhase(expected: PhaseType) {
    const current = this.getCurrentPhase();
    if (current !== expected) {
      throw new WrongPhaseError(expected, current);
    }
  }

  public eliminatePlayer(id: string): void {
    this.playerRoster.eliminatePlayer(id);
  }

  public getCurrentPhase(): PhaseType {
    return this.phase.getCurrentPhase();
  }

  public nextPhase(): PhaseType {
    return this.phase.nextPhase();
  }

  public addPlayer(name: string): Player {
    if (this.status !== MatchStatus.LOBBY) {
      throw new Error("Cannot join after match started");
    }

    return this.playerRoster.addPlayer(name);
  }

  public getPlayers(): Player[] {
    return this.playerRoster.getPlayers();
  }

  public getPlayerByID(id: string): Player {
    return this.playerRoster.getPlayerByID(id);
  }

  public advancePhase(): PhaseType {
    const context: MatchContext = {
      getCurrentPhase: () => this.getCurrentPhase(),
      getStatus: () => this.status,
      tallyVotes: () => this.voteTallier.tallyVotes(),
      getEliminatedThisRound: () => this.voteTallier.getEliminatedThisRound(),
      getPlayerByID: (id: string) => this.playerRoster.getPlayerByID(id),
      getAlivePlayers: () => this.playerRoster.getAlivePlayers(),
      resolveActions: () => this.actionResolver.resolveActions(),
      setStatus: (status: MatchStatus) => {
        this.status = status;
      },
    };

    const next = this.phaseManager.advance(context);
    this.phase.nextPhase();
    return next;
  }

  public getJesterWinners(): string[] {
    return Array.from(this.jesterWinners);
  }

  public getInvestigationResult(playerId: string): string | null {
    return this.actionResolver.getInvestigationResults().get(playerId) ?? null;
  }

  public getLastNightEvents(): ResolutionEvent[] {
    return this.actionResolver.getEvents();
  }
}
