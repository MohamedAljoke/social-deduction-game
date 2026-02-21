import crypto from "node:crypto";
import {
  AbilityDoesNotBelongToUser,
  MissingTemplate,
  PlayerIsDeadError,
  PlayerNotFound,
  WrongPhaseError,
} from "./errors";
import { Phase, PhaseType } from "./phase";
import { Player } from "./player";
import { AbilityId } from "./ability";
import { Action } from "./action";
import { AbilityEffectFactory, EffectRegistry } from "./effects";
import { ResolutionState } from "./resolution/ResolutionState";

export class Match {
  private players: Player[] = [];
  private phase: Phase = new Phase();
  private actionQueue: Action[] = [];
  private effectRegistry: EffectRegistry;

  constructor() {
    this.effectRegistry = AbilityEffectFactory.createRegistry();
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

  public resolveActions(): void {
    this.ensurePhase("resolution");

    const state: ResolutionState = {
      protected: new Set<string>(),
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
      effect!.execute(action, this.actionQueue, this, state);
    }

    // Clear the queue after resolution
    this.actionQueue = [];
  }
}
