import { Action } from "../action";
import { Match } from "../match";
import { ResolutionState } from "../resolution/ResolutionState";
import { IAbilityEffect } from "./IAbilityEffect";

export class ProtectEffect implements IAbilityEffect {
  readonly priority = 10;

  execute(
    action: Action,
    _allActions: Action[],
    _match: Match,
    state: ResolutionState,
  ): void {
    if (action.cancelled) return;

    for (const targetId of action.targetIds) {
      state.protected.add(targetId);
    }
  }
}
