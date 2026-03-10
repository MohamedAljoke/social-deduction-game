import { Player, PlayerResponse } from "./player";
import { Phase, PhaseType } from "./phase";
import { Action, DEFAULT_STAGE_BY_EFFECT } from "./action";
import { Alignment, Template } from "./template";
import {
  InsufficientPlayers,
  MatchAlreadyStarted,
  TemplateNotFound,
  TemplatePlayerCountMismatch,
  MatchNotStarted,
  InvalidPhase,
  PlayerNotInMatch,
  AbilityDoesNotBelongToUser,
  PlayerHasNoTemplate,
  PlayerIsDeadError,
  TargetNotAlive,
} from "../errors";
import { EffectType } from "./ability";
import { ActionResolver, ResolutionResult } from "../services/ActionResolver";

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
  status: MatchStatus;
  config?: MatchConfig;
  winnerAlignment?: Alignment | null;
  endedAt?: Date | null;
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
  private votes: Array<{ voterId: string; targetId: string | null }> = [];
  private config: MatchConfig;
  private winnerAlignment: Alignment | null;
  private endedAt: Date | null;

  constructor(props: MatchProps) {
    this.id = props.id;
    this.name = props.name;
    this.createdAt = props.createdAt;
    this.status = props.status;
    this.players = props.players ?? [];
    this.phase = props.phase ?? new Phase();
    this.actions = props.actions ?? [];
    this.templates = props.templates ?? [];
    this.config = props.config ?? { showVotingTransparency: true };
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
    this.winnerAlignment = null;
    this.endedAt = null;
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

  public submitVote(voterId: string, targetId: string | null): void {
    if (this.phase.getCurrentPhase() !== "voting") {
      throw new InvalidPhase();
    }

    const playersById = new Map(this.players.map((player) => [player.id, player]));
    const voter = playersById.get(voterId);

    if (!voter) {
      throw new PlayerNotInMatch();
    }

    if (!voter.isAlive()) {
      throw new PlayerIsDeadError();
    }

    if (targetId !== null) {
      const target = playersById.get(targetId);
      if (!target) {
        throw new PlayerNotInMatch();
      }

      if (!target.isAlive()) {
        throw new TargetNotAlive();
      }
    }

    const existing = this.votes.findIndex((v) => v.voterId === voterId);
    if (existing !== -1) {
      this.votes[existing] = { voterId, targetId };
    } else {
      this.votes.push({ voterId, targetId });
    }
  }

  public advancePhase(): PhaseType {
    if (this.status !== MatchStatus.STARTED) {
      throw new MatchNotStarted();
    }

    const isVotingPhase = this.phase.getCurrentPhase() === "voting";
    let playerEliminatedThisRound = false;
    if (isVotingPhase) {
      const skipCount = this.votes.filter((v) => v.targetId === null).length;
      const tally = new Map<string, number>();
      for (const { targetId } of this.votes) {
        if (targetId !== null) {
          tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
        }
      }

      if (tally.size > 0) {
        const [topTarget, topCount] = [...tally.entries()].reduce((a, b) =>
          b[1] > a[1] ? b : a,
        );
        const isTied =
          [...tally.values()].filter((v) => v === topCount).length > 1;
        if (!isTied && topCount > skipCount) {
          const player = this.players.find((p) => p.id === topTarget);
          if (player) {
            player.eliminate();
            playerEliminatedThisRound = true;
          }
        }
      }

      this.votes = [];
    }

    const nextPhase = this.phase.nextPhase();
    if (isVotingPhase && playerEliminatedThisRound) {
      this.finishIfWinnerExists();
    }

    return nextPhase;
  }

  public resolveActions(resolver: ActionResolver): ResolutionResult {
    if (this.status !== MatchStatus.STARTED) {
      throw new MatchNotStarted();
    }

    if (this.phase.getCurrentPhase() !== "resolution") {
      throw new InvalidPhase();
    }

    const result = resolver.resolve(this.actions, this.players, this.templates);
    this.actions = [];
    this.finishIfWinnerExists();
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

    const ability = template.getAbility(EffectType);
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

    this.actions.push(
      new Action(
        actorId,
        ability.id,
        ability.priority,
        DEFAULT_STAGE_BY_EFFECT[ability.id],
        uniqueTargetIds,
      ),
    );
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

  private finishIfWinnerExists(): void {
    if (this.status !== MatchStatus.STARTED) {
      return;
    }

    const winner = this.evaluateWinCondition();
    if (!winner) {
      return;
    }

    this.status = MatchStatus.FINISHED;
    this.winnerAlignment = winner;
    this.endedAt ??= new Date();
  }

  private evaluateWinCondition(): Alignment | null {
    const counts = this.getAliveAlignmentCounts();
    const aliveHeroes = counts[Alignment.Hero];
    const aliveVillains = counts[Alignment.Villain];

    if (aliveHeroes > 0 && aliveVillains === 0) {
      return Alignment.Hero;
    }

    if (aliveVillains > 0 && aliveVillains >= aliveHeroes) {
      return Alignment.Villain;
    }

    return null;
  }

  private getAliveAlignmentCounts(): Record<Alignment, number> {
    const counts: Record<Alignment, number> = {
      [Alignment.Hero]: 0,
      [Alignment.Villain]: 0,
      [Alignment.Neutral]: 0,
    };

    const templatesById = new Map(
      this.templates.map((template) => [template.id, template]),
    );

    for (const player of this.players) {
      if (!player.isAlive()) {
        continue;
      }

      const templateId = player.getTemplateId();
      if (!templateId) {
        continue;
      }

      const template = templatesById.get(templateId);
      if (!template) {
        continue;
      }

      counts[template.alignment] += 1;
    }

    return counts;
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
        EffectType: action.effectType,
        targetIds: action.targetIds,
        cancelled: action.cancelled,
      })),
      templates: this.templates.map((template) => ({
        id: template.id,
        name: template.name,
        alignment: template.alignment,
        abilities: template.abilities.map((ability) => ({
          id: ability.id,
        })),
        winCondition: template.winCondition,
        endsGameOnWin: template.endsGameOnWin,
      })),
      votes: this.votes,
      config: this.config,
      winnerAlignment: this.winnerAlignment,
      endedAt: this.endedAt,
    };
  }
}
