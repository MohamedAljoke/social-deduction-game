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
    if (this.getCurrentPhase() !== "action") {
      throw new WrongPhaseError("action", this.getCurrentPhase());
    }

    const actorPlayer = this.getPlayerByID(actorId);
    const actorPlayerTemplate = actorPlayer.getTemplate();
    if (!actorPlayerTemplate) {
      throw new MissingTemplate();
    }

    const ability = actorPlayerTemplate.getAbility(abilityId);
    if (!ability) {
      throw new AbilityDoesNotBelongToUser();
    }

    if (!actorPlayer.isAlive() && !ability.canUseWhenDead) {
      throw new PlayerIsDeadError();
    }

    const action = new Action(actorId, abilityId, targetIds);

    this.actionQueue.push(action);
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

  public addPlayer(name: string): void {
    const id = crypto.randomUUID();
    this.players.push(new Player(id, name));
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
