import { Action } from "../action";
import { ResolutionContext } from "../resolution/ResolutionContext";
import { ResolutionState } from "../resolution/ResolutionState";
import { IAbilityEffect } from "./IAbilityEffect";

export class RoleblockEffect implements IAbilityEffect {
  readonly priority = 5;

  execute(
    action: Action,
    allActions: Action[],
    _context: ResolutionContext,
    _state: ResolutionState,
  ): void {
    if (action.cancelled) return;

    for (const targetId of action.targetIds) {
      for (const a of allActions) {
        if (a.actorId === targetId) {
          a.cancelled = true;
        }
      }
    }
  }
}
