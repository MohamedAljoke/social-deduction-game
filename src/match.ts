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

export class Match {
  private players: Player[] = [];
  private phase: Phase = new Phase();
  private actionQueue: Action[] = [];

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
}
