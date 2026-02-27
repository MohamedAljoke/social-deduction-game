import { Player, PlayerResponse } from "./player";
import { Phase, PhaseType } from "./phase";
import { Action } from "./action";
import { Template } from "./template";
import {
  InsufficientPlayers,
  MatchAlreadyStarted,
  TemplateNotFound,
  TemplatePlayerCountMismatch,
} from "../errors";

export enum MatchStatus {
  LOBBY = "lobby",
  STARTED = "started",
  FINISHED = "finished",
}

export type MatchResponse = ReturnType<Match["toJSON"]>;

interface MatchProps {
  id: string;
  name: string;
  createdAt: Date;
  players?: Player[];
  phase?: Phase;
  actions?: Action[];
  templates?: Template[];
  status: MatchStatus;
}

export class Match {
  public readonly id: string;
  public readonly name: string;
  public readonly createdAt: Date;

  private status: MatchStatus;
  private players: Player[];
  private phase: Phase;
  private actions: Action[];
  private templates: Template[];

  constructor(props: MatchProps) {
    this.id = props.id;
    this.name = props.name;
    this.createdAt = props.createdAt;
    this.status = props.status;
    this.players = props.players ?? [];
    this.phase = props.phase ?? new Phase();
    this.actions = props.actions ?? [];
    this.templates = props.templates ?? [];
  }

  static create(name: string): Match {
    return new Match({
      id: crypto.randomUUID().toString(),
      name: name,
      status: MatchStatus.LOBBY,
      createdAt: new Date(),
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

  public setTemplates(templates: Template[]): void {
    this.templates = templates;
  }

  public startWithTemplates(templates: Template[]): void {
    this.templates = templates;

    this.validateStart();
    this.assignTemplates();

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

  private assignTemplates() {
    const shuffled = this.shuffle(this.templates);

    for (let i = 0; i < this.players.length; i++) {
      this.players[i].assignTemplate(shuffled[i].id);
    }
  }

  private validateStart() {
    if (this.status !== MatchStatus.LOBBY) {
      throw new MatchAlreadyStarted();
    }

    if (this.players.length < 2) {
      throw new InsufficientPlayers();
    }

    if (!this.templates || this.templates.length === 0) {
      throw new TemplateNotFound();
    }

    if (this.templates.length !== this.players.length) {
      throw new TemplatePlayerCountMismatch(
        this.templates.length,
        this.players.length,
      );
    }
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
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
