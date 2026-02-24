import { IWinCondition, PlayerSnapshot, WinResult } from "./IWinCondition";

export class VoteEliminatedWinCondition implements IWinCondition {
  readonly id = "vote_eliminated";

  evaluate(
    players: ReadonlyArray<PlayerSnapshot>,
    voteEliminatedThisRound: string | null,
    _currentStatus: "lobby" | "started" | "finished",
  ): WinResult | null {
    if (!voteEliminatedThisRound) {
      return null;
    }

    const eliminatedPlayer = players.find(p => p.id === voteEliminatedThisRound);
    if (!eliminatedPlayer) {
      return null;
    }

    if (eliminatedPlayer.winCondition !== "vote_eliminated") {
      return null;
    }

    return {
      winnerId: this.id,
      winnerLabel: "jester",
      playerIds: [eliminatedPlayer.id],
      endsGame: eliminatedPlayer.endsGameOnWin,
    };
  }
}
