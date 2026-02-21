import { Action } from "../action";
import { ResolutionContext } from "../resolution/ResolutionContext";
import { ResolutionState } from "../resolution/ResolutionState";
import { IAbilityEffect } from "./IAbilityEffect";

export class KillEffect implements IAbilityEffect {
  readonly priority = 20;

  execute(
    action: Action,
    _allActions: Action[],
    context: ResolutionContext,
    state: ResolutionState,
  ): void {
    if (action.cancelled) return;

    for (const targetId of action.targetIds) {
      if (!state.protected.has(targetId)) {
        context.killPlayer(targetId);
      }
    }
  }
}
