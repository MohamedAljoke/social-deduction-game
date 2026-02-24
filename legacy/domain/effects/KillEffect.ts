import { Action } from "../models/action";
import { ResolutionContext } from "../resolution/ResolutionContext";
import { ResolutionState } from "../resolution/ResolutionState";
import { IAbilityEffect } from "./IAbilityEffect";
import { PROTECTED_KEY } from "./ProtectEffect";

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
      if (!state.getSet(PROTECTED_KEY).has(targetId)) {
        context.killPlayer(targetId);
        context.emit({
          type: "killed",
          actorId: action.actorId,
          targetIds: [targetId],
          abilityId: action.abilityId,
        });
      } else {
        context.emit({
          type: "kill_blocked",
          actorId: action.actorId,
          targetIds: [targetId],
          abilityId: action.abilityId,
        });
      }
    }
  }
}
