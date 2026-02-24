import { IWinCondition, PlayerSnapshot, WinResult } from "./IWinCondition";

export class MajorityWinCondition implements IWinCondition {
  readonly id = "majority";

  evaluate(
    players: ReadonlyArray<PlayerSnapshot>,
    _voteEliminatedThisRound: string | null,
    currentStatus: "lobby" | "started" | "finished",
  ): WinResult | null {
    if (currentStatus !== "started") {
      return null;
    }

    const alivePlayers = players.filter(p => p.alive);

    if (alivePlayers.length === 0) {
      return {
        winnerId: this.id,
        winnerLabel: "draw",
        playerIds: [],
        endsGame: true,
      };
    }

    const aliveVillains = alivePlayers.filter(p => p.alignment === "villain").length;
    const aliveHeroes = alivePlayers.filter(p => p.alignment === "hero").length;

    if (aliveVillains > 0 && aliveVillains >= aliveHeroes) {
      const winningPlayers = alivePlayers
        .filter(p => p.alignment === "villain")
        .map(p => p.id);
      return {
        winnerId: this.id,
        winnerLabel: "villains",
        playerIds: winningPlayers,
        endsGame: true,
      };
    }

    if (aliveVillains === 0) {
      const winningPlayers = alivePlayers
        .filter(p => p.alignment === "hero")
        .map(p => p.id);
      return {
        winnerId: this.id,
        winnerLabel: "heroes",
        playerIds: winningPlayers,
        endsGame: true,
      };
    }

    return null;
  }
}
