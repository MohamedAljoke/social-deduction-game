import { Player } from "./player";
import { Phase, PhaseType } from "./phase";
import { Action } from "./action";
import { Alignment, Template } from "./template";
import { MatchAlreadyStarted, MatchNotStarted } from "../errors";
import { EffectType } from "./ability";
import {
  AbilityActionFactory,
  MatchSnapshotMapper,
  MatchVoting,
  TemplateAssignmentService,
  WinConditionEvaluator,
} from "../services/match";
import { ActionResolver, ResolutionResult } from "../services/resolution";
import { MatchDomainEvent, MatchPlayerAssignment } from "../events/match-events";

function generateShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export enum MatchStatus {
  LOBBY = "lobby",
  STARTED = "started",
  FINISHED = "finished",
}

export type MatchResponse = ReturnType<Match["toJSON"]>;

export interface TemplateWinnerSummary {
  templateId: string;
  templateName: string;
  alignment: Alignment;
}

export type MatchWinner =
  | {
      kind: "alignment";
      alignment: Alignment;
    }
  | {
      kind: "templates";
      templates: TemplateWinnerSummary[];
    };

export interface MatchConfig {
  showVotingTransparency: boolean;
}

interface MatchProps {
  id: string;
  name: string;
  createdAt: Date;
  players?: Player[];
  phase?: Phase;
  actions?: Action[];
  templates?: Template[];
  votes?: Array<{ voterId: string; targetId: string | null }>;
  status: MatchStatus;
  config?: MatchConfig;
  winner?: MatchWinner | null;
  winnerAlignment?: Alignment | null;
  endedAt?: Date | null;
}

export class Match {
  private readonly templateAssignment = new TemplateAssignmentService();
  private readonly abilityActionFactory = new AbilityActionFactory();
  private readonly winConditionEvaluator = new WinConditionEvaluator();
  private readonly snapshotMapper = new MatchSnapshotMapper();

  public readonly id: string;
  public readonly name: string;
  public readonly createdAt: Date;

  private status: MatchStatus;
  private players: Player[];
  private phase: Phase;
  private actions: Action[];
  private templates: Template[];
  private readonly voting: MatchVoting;
  private config: MatchConfig;
  private winner: MatchWinner | null;
  private winnerAlignment: Alignment | null;
  private endedAt: Date | null;
  private _domainEvents: MatchDomainEvent[] = [];

  public pullEvents(): MatchDomainEvent[] {
    const events = this._domainEvents;
    this._domainEvents = [];
    return events;
  }

  private emit(event: MatchDomainEvent): void {
    this._domainEvents.push(event);
  }

  constructor(props: MatchProps) {
    this.id = props.id;
    this.name = props.name;
    this.createdAt = props.createdAt;
    this.status = props.status;
    this.players = props.players ?? [];
    this.phase = props.phase ?? new Phase();
    this.actions = props.actions ?? [];
    this.templates = props.templates ?? [];
    this.voting = new MatchVoting(props.votes);
    this.config = props.config ?? { showVotingTransparency: true };
    this.winner = props.winner ?? null;
    this.winnerAlignment = props.winnerAlignment ?? null;
    this.endedAt = props.endedAt ?? null;
  }

  static create(name: string, config?: Partial<MatchConfig>): Match {
    return new Match({
      id: generateShortCode(),
      name: name,
      status: MatchStatus.LOBBY,
      createdAt: new Date(),
      config: {
        showVotingTransparency: config?.showVotingTransparency ?? true,
      },
    });
  }

  public getStatus(): MatchStatus {
    return this.status;
  }

  public getPlayers(): Player[] {
    return this.players;
  }

  public getTemplates(): Template[] {
    return this.templates;
  }

  public getWinnerAlignment(): Alignment | null {
    return this.winnerAlignment;
  }

  public getWinner(): MatchWinner | null {
    return this.winner;
  }

  public setTemplates(templates: Template[]): void {
    this.templates = templates;
  }

  public startWithTemplates(templates: Template[]): void {
    this.templates = this.templateAssignment.assign(
      this.status,
      this.players,
      templates,
    );

    this.status = MatchStatus.STARTED;
    this.winner = null;
    this.winnerAlignment = null;
    this.endedAt = null;

    const playerAssignments = this.buildPlayerAssignments();
    this.emit({ type: "MatchStarted", matchId: this.id, playerAssignments });
  }

  public addPlayer(player: Player): void {
    if (this.status !== MatchStatus.LOBBY) {
      throw new MatchAlreadyStarted();
    }

    this.players.push(player);
    this.emit({
      type: "PlayerJoined",
      matchId: this.id,
      player: player.toJSON(),
    });
  }

  public removePlayer(playerId: string): void {
    this.players = this.players.filter((p) => p.id !== playerId);
    this.emit({ type: "PlayerLeft", matchId: this.id, playerId });
  }

  public getPhase(): PhaseType {
    return this.phase.getCurrentPhase();
  }

  public submitVote(voterId: string, targetId: string | null): void {
    this.voting.submitVote(this.phase, this.players, voterId, targetId);
    this.emit({ type: "VoteSubmitted", matchId: this.id, voterId, targetId });
  }

  public advancePhase(): PhaseType {
    if (this.status !== MatchStatus.STARTED) {
      throw new MatchNotStarted();
    }

    const isVotingPhase = this.phase.isVoting();
    let playerEliminatedThisRound = false;
    if (isVotingPhase) {
      const result = this.voting.resolveRound();
      if (result.eliminatedPlayerId) {
        const player = this.players.find(
          (candidate) => candidate.id === result.eliminatedPlayerId,
        );
        if (player) {
          player.eliminate();
          playerEliminatedThisRound = true;
        }
      }

      this.voting.clear();
    }

    const nextPhase = this.phase.nextPhase();
    if (isVotingPhase && playerEliminatedThisRound) {
      this.finishIfWinnerExists();
    }

    this.emit({ type: "PhaseAdvanced", matchId: this.id, phase: nextPhase });
    return nextPhase;
  }

  public resolveActions(resolver: ActionResolver): ResolutionResult {
    if (this.status !== MatchStatus.STARTED) {
      throw new MatchNotStarted();
    }

    this.phase.assertCanResolve();

    const result = resolver.resolve(this.actions, this.players, this.templates);
    this.actions = [];
    this.finishIfWinnerExists();
    this.emit({ type: "ActionsResolved", matchId: this.id, effects: result.effects });
    return result;
  }

  public getActions(): Action[] {
    return this.actions;
  }

  public addAction(action: Action): void {
    this.actions.push(action);
  }

  public useAbility(
    actorId: string,
    EffectType: EffectType,
    targetIds: string[],
  ): void {
    if (this.status !== MatchStatus.STARTED) {
      throw new MatchNotStarted();
    }

    this.phase.assertCanUseAbility();

    this.actions.push(
      this.abilityActionFactory.create(
        actorId,
        EffectType,
        targetIds,
        this.players,
        this.templates,
      ),
    );
  }

  private finishIfWinnerExists(): void {
    if (this.status !== MatchStatus.STARTED) {
      return;
    }

    const winner = this.winConditionEvaluator.evaluate(
      this.players,
      this.templates,
    );
    if (!winner) {
      return;
    }

    this.status = MatchStatus.FINISHED;
    this.winner = winner;
    this.winnerAlignment =
      winner.kind === "alignment" ? winner.alignment : null;
    this.endedAt ??= new Date();
    this.emit({ type: "MatchEnded", matchId: this.id, winner });
  }

  private buildPlayerAssignments(): MatchPlayerAssignment[] {
    return this.players.map((player) => {
      const templateId = player.getTemplateId();
      if (!templateId) {
        throw new Error(
          `Player ${player.id} is missing a template after match start`,
        );
      }

      const template = this.templates.find((candidate) => candidate.id === templateId);
      if (!template) {
        throw new Error(
          `Template ${templateId} assigned to player ${player.id} was not found`,
        );
      }

      return {
        playerId: player.id,
        templateId,
        alignment: template.alignment,
      };
    });
  }

  toJSON() {
    return this.snapshotMapper.map({
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      status: this.status,
      players: this.players,
      phase: this.phase.getCurrentPhase(),
      actions: this.actions,
      templates: this.templates,
      votes: this.voting.getVotes(),
      config: this.config,
      winner: this.winner,
      winnerAlignment: this.winnerAlignment,
      endedAt: this.endedAt,
    });
  }
}
