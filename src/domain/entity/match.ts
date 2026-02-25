import { Player, PlayerResponse } from "./player";
import { Phase, PhaseType } from "./phase";
import { Action } from "./action";

export enum MatchStatus {
  LOBBY = "lobby",
  STARTED = "started",
  FINISHED = "finished",
}

export type MatchResponse = ReturnType<Match["toJSON"]>;

interface MatchProps {
  id: string;
  name: string;
  templateId?: string;
  createdAt?: Date;
  players?: Player[];
  phase?: Phase;
  actions?: Action[];
}

export class Match {
  public readonly id: string;
  public name: string;
  public readonly createdAt: Date;
  public readonly templateId?: string;

  private status: MatchStatus;
  private players: Player[];
  private phase: Phase;
  private actions: Action[];

  constructor(props: MatchProps) {
    this.id = props.id;
    this.name = props.name;
    this.templateId = props.templateId;
    this.createdAt = props.createdAt ?? new Date();
    this.status = MatchStatus.LOBBY;
    this.players = props.players ?? [];
    this.phase = props.phase ?? new Phase();
    this.actions = props.actions ?? [];
  }

  public getStatus(): MatchStatus {
    return this.status;
  }

  public getPlayers(): Player[] {
    return this.players;
  }

  public addPlayer(player: Player): void {
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
      templateId: this.templateId,
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
    };
  }
}
