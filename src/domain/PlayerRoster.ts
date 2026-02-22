import crypto from "node:crypto";
import { Player } from "./player";
import { PlayerNotFound, TemplatePlayerCountMismatch } from "./errors";
import { Template } from "./template";

export class PlayerRoster {
  private players: Player[] = [];

  addPlayer(name: string): Player {
    const id = crypto.randomUUID();
    const player = new Player(id, name);
    this.players.push(player);
    return player;
  }

  getPlayers(): Player[] {
    return this.players;
  }

  getPlayerByID(id: string): Player {
    const player = this.players.find((p) => p.id === id);
    if (!player) {
      throw new PlayerNotFound();
    }
    return player;
  }

  eliminatePlayer(id: string): void {
    const player = this.getPlayerByID(id);
    player.eliminate();
  }

  assignTemplates(templates: Template[]): void {
    if (templates.length !== this.players.length) {
      throw new TemplatePlayerCountMismatch(templates.length, this.players.length);
    }

    const templateMap = new Map(templates.map((t) => [t.id, t]));
    this.players.forEach((player, index) => {
      const template = templateMap.get(templates[index].id);
      if (template) {
        player.assignTemplate(template);
      }
    });
  }

  getAlivePlayers(): Player[] {
    return this.players.filter((p) => p.isAlive());
  }

  getPlayerAlignment(id: string): string {
    const player = this.getPlayerByID(id);
    return player.getTemplate()?.alignment ?? "unknown";
  }

  isPlayerAlive(id: string): boolean {
    const player = this.getPlayerByID(id);
    return player.isAlive();
  }
}
