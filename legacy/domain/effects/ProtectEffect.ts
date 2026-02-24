import { Action } from "../models/action";
import { ResolutionContext } from "../resolution/ResolutionContext";
import { ResolutionState } from "../resolution/ResolutionState";
import { IAbilityEffect } from "./IAbilityEffect";

export const PROTECTED_KEY = "protected";

export class ProtectEffect implements IAbilityEffect {
  readonly priority = 10;

  execute(
    action: Action,
    _allActions: Action[],
    context: ResolutionContext,
    state: ResolutionState,
  ): void {
    if (action.cancelled) return;

    for (const targetId of action.targetIds) {
      state.getSet(PROTECTED_KEY).add(targetId);
      context.emit({
        type: "protected",
        actorId: action.actorId,
        targetIds: [targetId],
        abilityId: action.abilityId,
      });
    }
  }
}
