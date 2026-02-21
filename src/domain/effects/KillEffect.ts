import { Action } from "../action";
import { Match } from "../match";
import { ResolutionState } from "../resolution/ResolutionState";
import { IAbilityEffect } from "./IAbilityEffect";

export class KillEffect implements IAbilityEffect {
  readonly priority = 20;

  execute(
    action: Action,
    _allActions: Action[],
    match: Match,
    state: ResolutionState,
  ): void {
    if (action.cancelled) return;

    for (const targetId of action.targetIds) {
      if (!state.protected.has(targetId)) {
        match.eliminatePlayer(targetId);
      }
    }
  }
}
