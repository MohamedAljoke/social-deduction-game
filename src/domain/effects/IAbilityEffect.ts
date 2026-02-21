import { Action } from "../action";
import { ResolutionContext } from "../resolution/ResolutionContext";
import { ResolutionState } from "../resolution/ResolutionState";

export interface IAbilityEffect {
  readonly priority: number;
  execute(
    action: Action,
    allActions: Action[],
    context: ResolutionContext,
    state: ResolutionState,
  ): void;
}
