import { Player, PlayerResponse } from "./player";
import { Phase, PhaseType } from "./phase";
import { Action } from "./action";
import { Template } from "./template";
import {
  InsufficientPlayers,
  MatchAlreadyStarted,
  TemplateNotFound,
  TemplatePlayerCountMismatch,
  MatchNotStarted,
  InvalidPhase,
  PlayerNotInMatch,
  PlayerIsDeadError,
  AbilityDoesNotBelongToUser,
  InvalidTargetCount,
  CannotTargetSelf,
  TargetNotAlive,
  PlayerHasNoTemplate,
} from "../errors";
import { AbilityId } from "./ability";

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
      id: generateShortCode(),
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
    this.validateStart(templates);

    const missing = this.players.length - templates.length;

    const padded = [
      ...templates,
      ...Array.from({ length: Math.max(0, missing) }, (_, i) =>
        Template.default(`default_template_${templates.length + i}`),
      ),
    ];

    this.templates = padded;
    this.assignTemplatesToPlayers();

    this.status = MatchStatus.STARTED;
  }

  public addPlayer(player: Player): void {
    if (this.status !== MatchStatus.LOBBY) {
      throw new MatchAlreadyStarted();
    }

    this.players.push(player);
  }

  public removePlayer(playerId: string): void {
    this.players = this.players.filter((p) => p.id !== playerId);
  }

  public getPhase(): PhaseType {
    return this.phase.getCurrentPhase();
  }

  public advancePhase(): PhaseType {
    if (this.status !== MatchStatus.STARTED) {
      throw new MatchNotStarted();
    }

    return this.phase.nextPhase();
  }

  public getActions(): Action[] {
    return this.actions;
  }

  public addAction(action: Action): void {
    this.actions.push(action);
  }

  public useAbility(
    actorId: string,
    abilityId: AbilityId,
    targetIds: string[],
  ): void {
    if (this.status !== MatchStatus.STARTED) {
      throw new MatchNotStarted();
    }

    if (this.phase.getCurrentPhase() !== "action") {
      throw new InvalidPhase();
    }

    const uniqueTargetIds = [...new Set(targetIds)];

    const playersById = new Map(this.players.map((p) => [p.id, p]));

    const actor = playersById.get(actorId);
    if (!actor) {
      throw new PlayerNotInMatch();
    }

    const templateId = actor.getTemplateId();
    if (!templateId) {
      throw new PlayerHasNoTemplate();
    }

    const template = this.templates.find((t) => t.id === templateId);
    if (!template) {
      throw new TemplateNotFound();
    }

    const ability = template.getAbility(abilityId);
    if (!ability) {
      throw new AbilityDoesNotBelongToUser();
    }

    const targets = uniqueTargetIds.map((id) => {
      const target = playersById.get(id);
      if (!target) throw new PlayerNotInMatch();
      return target;
    });

    ability.validateUsage({
      actor,
      targets,
    });

    this.actions.push(new Action(actorId, abilityId, uniqueTargetIds));
  }

  private assignTemplatesToPlayers() {
    const shuffled = this.shuffle(this.templates);

    for (let i = 0; i < this.players.length; i++) {
      this.players[i].assignTemplate(shuffled[i].id);
    }
  }

  private validateStart(templates: Template[]) {
    if (this.status !== MatchStatus.LOBBY) {
      throw new MatchAlreadyStarted();
    }

    if (this.players.length < 2) {
      throw new InsufficientPlayers();
    }

    if (templates.length > this.players.length) {
      throw new TemplatePlayerCountMismatch(
        templates.length,
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
