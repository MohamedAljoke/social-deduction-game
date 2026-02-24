import { Action } from "../models/action";
import { ResolutionContext } from "../resolution/ResolutionContext";
import { ResolutionState } from "../resolution/ResolutionState";
import { IAbilityEffect } from "./IAbilityEffect";

export const INVESTIGATIONS_KEY = "investigations";

export class InvestigateEffect implements IAbilityEffect {
  readonly priority = 30;

  execute(
    action: Action,
    _allActions: Action[],
    context: ResolutionContext,
    state: ResolutionState,
  ): void {
    if (action.cancelled) return;

    for (const targetId of action.targetIds) {
      if (context.isPlayerAlive(targetId)) {
        const alignment = context.getPlayerAlignment(targetId);
        state.getMap(INVESTIGATIONS_KEY).set(action.actorId, alignment);
        context.emit({
          type: "investigated",
          actorId: action.actorId,
          targetIds: [targetId],
          abilityId: action.abilityId,
          message: `Investigated ${targetId}: ${alignment}`,
        });
      }
    }
  }
}
