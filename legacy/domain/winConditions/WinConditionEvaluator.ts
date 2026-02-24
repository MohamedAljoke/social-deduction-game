import { IWinCondition, PlayerSnapshot, WinResult } from "./IWinCondition";

export class WinConditionEvaluator {
  private conditions: IWinCondition[];

  constructor(conditions: IWinCondition[] = []) {
    this.conditions = conditions;
  }

  public register(condition: IWinCondition): void {
    this.conditions.push(condition);
  }

  public evaluate(
    players: ReadonlyArray<PlayerSnapshot>,
    voteEliminatedThisRound: string | null,
    currentStatus: "lobby" | "started" | "finished",
  ): WinResult | null {
    for (const condition of this.conditions) {
      const result = condition.evaluate(players, voteEliminatedThisRound, currentStatus);
      if (result) {
        return result;
      }
    }
    return null;
  }
}
