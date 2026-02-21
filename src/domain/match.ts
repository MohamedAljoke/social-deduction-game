import crypto from "node:crypto";
import {
  AbilityDoesNotBelongToUser,
  MatchAlreadyStarted,
  MissingTemplate,
  PlayerIsDeadError,
  PlayerNotFound,
  WrongPhaseError,
} from "./errors";
import { Phase, PhaseType } from "./phase";
import { Player } from "./player";
import { AbilityId } from "./ability";
import { Action } from "./action";
import { Vote } from "./vote";
import { AbilityEffectFactory, EffectRegistry } from "./effects";
import { ResolutionState } from "./resolution/ResolutionState";
import { ResolutionContext } from "./resolution/ResolutionContext";
import { Template } from "./template";

export enum MatchStatus {
  LOBBY = "lobby",
  STARTED = "started",
  FINISHED = "finished",
}

export class Match {
  private players: Player[] = [];
  private phase: Phase = new Phase();
  private actionQueue: Action[] = [];
  private voteQueue: Vote[] = [];
  private effectRegistry: EffectRegistry;
  private status: MatchStatus;

  constructor() {
    this.effectRegistry = AbilityEffectFactory.createRegistry();
    this.status = MatchStatus.LOBBY;
  }

  getStatus() {
    return this.status;
  }

  getWinner(): "heroes" | "villains" | "draw" | null {
    if (this.status !== MatchStatus.FINISHED) {
      return null;
    }

    const alivePlayers = this.players.filter(p => p.isAlive());

    if (alivePlayers.length === 0) {
      return "draw";
    }

    const aliveVillains = alivePlayers.filter(p =>
      p.getTemplate()?.alignment === "villain"
    ).length;

    return aliveVillains === 0 ? "heroes" : "villains";
  }

  public start(templates: Template[]): void {
    if (this.status !== MatchStatus.LOBBY) {
      throw new MatchAlreadyStarted();
    }

    const templateMap = new Map(templates.map((t) => [t.id, t]));

    this.players.forEach((player, index) => {
      const template = templateMap.get(templates[index].id);
      if (template) {
        player.assignTemplate(template);
      }
    });

    this.status = MatchStatus.STARTED;
  }

  public submitAction(
    actorId: string,
    abilityId: AbilityId,
    targetIds: string[],
  ): void {
    this.ensurePhase("action");

    const player = this.getPlayerByID(actorId);
    const action = player.act(abilityId, targetIds);

    this.actionQueue.push(action);
  }

  public submitVote(voterId: string, targetId: string): void {
    this.ensurePhase("voting");

    const voter = this.getPlayerByID(voterId);
    const target = this.getPlayerByID(targetId);

    if (!voter.isAlive()) {
      throw new PlayerIsDeadError();
    }

    if (!target.isAlive()) {
      throw new PlayerIsDeadError();
    }

    // Remove previous vote from this voter
    this.voteQueue = this.voteQueue.filter(v => v.voterId !== voterId);

    const vote = new Vote(voterId, targetId);
    this.voteQueue.push(vote);
  }

  private ensurePhase(expected: PhaseType) {
    const current = this.getCurrentPhase();
    if (current !== expected) {
      throw new WrongPhaseError("action", this.getCurrentPhase());
    }
  }
  public eliminatePlayer(id: string): void {
    const player = this.getPlayerByID(id);
    player.eliminate();
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

    const id = crypto.randomUUID();
    const player = new Player(id, name);
    this.players.push(player);

    return player;
  }

  public getPlayers(): Player[] {
    return this.players;
  }

  public getPlayerByID(id: string): Player {
    const player = this.players.find((p) => p.id === id);

    if (!player) {
      throw new PlayerNotFound();
    }

    return player;
  }

  public advancePhase(): PhaseType {
    const currentPhase = this.getCurrentPhase();
    const next = this.phase.nextPhase();

    // Tally votes when leaving voting phase
    if (currentPhase === "voting") {
      this.tallyVotes();
    }

    // Resolve actions when entering resolution phase
    if (next === "resolution") {
      this.resolveActions();
      this.checkWinCondition();
    }

    return next;
  }

  private tallyVotes(): void {
    if (this.voteQueue.length === 0) {
      return;
    }

    // Count votes for each target
    const voteCounts = new Map<string, number>();
    for (const vote of this.voteQueue) {
      const currentCount = voteCounts.get(vote.targetId) || 0;
      voteCounts.set(vote.targetId, currentCount + 1);
    }

    // Find player(s) with most votes
    let maxVotes = 0;
    let playersWithMaxVotes: string[] = [];

    for (const [playerId, count] of voteCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        playersWithMaxVotes = [playerId];
      } else if (count === maxVotes) {
        playersWithMaxVotes.push(playerId);
      }
    }

    // Eliminate if there's a clear majority (no ties)
    if (playersWithMaxVotes.length === 1) {
      this.eliminatePlayer(playersWithMaxVotes[0]);
    }

    // Clear votes
    this.voteQueue = [];
  }

  private checkWinCondition(): void {
    const alivePlayers = this.players.filter(p => p.isAlive());

    if (alivePlayers.length === 0) {
      this.status = MatchStatus.FINISHED;
      return;
    }

    const aliveVillains = alivePlayers.filter(p =>
      p.getTemplate()?.alignment === "villain"
    ).length;

    const aliveHeroes = alivePlayers.filter(p =>
      p.getTemplate()?.alignment === "hero"
    ).length;

    // Villains win if they equal or outnumber heroes
    if (aliveVillains > 0 && aliveVillains >= aliveHeroes) {
      this.status = MatchStatus.FINISHED;
      return;
    }

    // Heroes win if all villains are dead
    if (aliveVillains === 0) {
      this.status = MatchStatus.FINISHED;
      return;
    }
  }

  private resolveActions(): void {
    const state: ResolutionState = {
      protected: new Set<string>(),
    };

    const context: ResolutionContext = {
      killPlayer: (id: string) => this.eliminatePlayer(id),
      isPlayerAlive: (id: string) => {
        const player = this.getPlayerByID(id);
        return player.isAlive();
      },
    };

    // Create action-effect pairs and sort by priority
    const actionEffectPairs = this.actionQueue
      .map((action) => ({
        action,
        effect: this.effectRegistry.getEffect(action.abilityId),
      }))
      .filter((pair) => pair.effect !== undefined)
      .sort((a, b) => a.effect!.priority - b.effect!.priority);

    // Execute effects in priority order
    for (const { action, effect } of actionEffectPairs) {
      effect!.execute(action, this.actionQueue, context, state);
    }

    // Clear the queue after resolution
    this.actionQueue = [];
  }
}
