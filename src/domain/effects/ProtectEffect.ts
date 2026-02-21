import { Action } from "../action";
import { ResolutionContext } from "../resolution/ResolutionContext";
import { ResolutionState } from "../resolution/ResolutionState";
import { IAbilityEffect } from "./IAbilityEffect";

export class ProtectEffect implements IAbilityEffect {
  readonly priority = 10;

  execute(
    action: Action,
    _allActions: Action[],
    _context: ResolutionContext,
    state: ResolutionState,
  ): void {
    if (action.cancelled) return;

    for (const targetId of action.targetIds) {
      state.protected.add(targetId);
    }
  }
}
