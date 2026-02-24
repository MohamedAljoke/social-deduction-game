import { Player } from "../models/player";

export interface PlayerSnapshot {
  id: string;
  name: string;
  alive: boolean;
  alignment: "hero" | "villain" | "neutral" | "unknown";
  winCondition: "default" | "vote_eliminated";
  endsGameOnWin: boolean;
}

export type WinResult = {
  winnerId: string;
  winnerLabel: "heroes" | "villains" | "jester" | "draw";
  playerIds: string[];
  endsGame: boolean;
};

export interface IWinCondition {
  readonly id: string;
  evaluate(
    players: ReadonlyArray<PlayerSnapshot>,
    voteEliminatedThisRound: string | null,
    currentStatus: "lobby" | "started" | "finished",
  ): WinResult | null;
}

export function playerToSnapshot(player: Player): PlayerSnapshot {
  const template = player.getTemplate();
  return {
    id: player.id,
    name: player.name,
    alive: player.isAlive(),
    alignment: template?.alignment ?? "unknown",
    winCondition: template?.winCondition ?? "default",
    endsGameOnWin: template?.endsGameOnWin ?? true,
  };
}
