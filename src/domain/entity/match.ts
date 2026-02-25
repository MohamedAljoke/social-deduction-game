import { Player, PlayerResponse } from "./player";
import { Phase, PhaseType } from "./phase";
import { Action } from "./action";
import { Template } from "./template";
import { InsufficientPlayers, MatchAlreadyStarted } from "../errors";

export enum MatchStatus {
  LOBBY = "lobby",
  STARTED = "started",
  FINISHED = "finished",
}

export type MatchResponse = ReturnType<Match["toJSON"]>;

interface MatchProps {
  id: string;
  name: string;
  createdAt?: Date;
  players?: Player[];
  phase?: Phase;
  actions?: Action[];
  templates?: Template[];
}

export class Match {
  public readonly id: string;
  public name: string;
  public readonly createdAt: Date;

  private status: MatchStatus;
  private players: Player[];
  private phase: Phase;
  private actions: Action[];
  private templates: Template[];

  constructor(props: MatchProps) {
    this.id = props.id;
    this.name = props.name;
    this.createdAt = props.createdAt ?? new Date();
    this.status = MatchStatus.LOBBY;
    this.players = props.players ?? [];
    this.phase = props.phase ?? new Phase();
    this.actions = props.actions ?? [];
    this.templates = props.templates ?? [];
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

  public setTemplates(templates: Template[]): void {
    this.templates = templates;
  }

  public start(): void {
    if (this.status !== MatchStatus.LOBBY) {
      throw new MatchAlreadyStarted();
    }

    if (this.players.length < 2) {
      throw new InsufficientPlayers();
    }

    this.status = MatchStatus.STARTED;
  }

  public addPlayer(player: Player): void {
    if (this.status !== MatchStatus.LOBBY) {
      throw new MatchAlreadyStarted();
    }

    this.players.push(player);
  }

  public getPhase(): PhaseType {
    return this.phase.getCurrentPhase();
  }

  public advancePhase(): PhaseType {
    return this.phase.nextPhase();
  }

  public getActions(): Action[] {
    return this.actions;
  }

  public addAction(action: Action): void {
    this.actions.push(action);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      status: this.status,
      players: this.players.map(
        (player: Player): PlayerResponse => player.toJSON(),
      ),
      phase: this.phase.getCurrentPhase(),
      actions: this.actions.map((action) => ({
        actorId: action.actorId,
        abilityId: action.abilityId,
        targetIds: action.targetIds,
        cancelled: action.cancelled,
      })),
      templates: this.templates.map((template) => ({
        id: template.id,
        alignment: template.alignment,
        abilities: template.abilities.map((ability) => ({
          id: ability.id,
        })),
        winCondition: template.winCondition,
        endsGameOnWin: template.endsGameOnWin,
      })),
    };
  }
}
