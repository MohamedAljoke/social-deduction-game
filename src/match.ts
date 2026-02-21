import crypto from "node:crypto";
import { PlayerNotFound } from "./errors";
import { Phase, PhaseType } from "./phase";
import { Player } from "./player";

export class Match {
  private players: Player[] = [];
  private phase: Phase = new Phase();

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
