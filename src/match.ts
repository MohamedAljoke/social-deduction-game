import crypto from "node:crypto";
import { PlayerNotFound } from "./errors";

type Player = {
  id: string;
  name: string;
};

export class Match {
  public players: Player[] = [];

  public addPlayer(name: string): void {
    const id = crypto.randomUUID();
    this.players.push({ id: id, name });
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
