import { Action } from "../action";
import { Match } from "../match";
import { ResolutionState } from "../resolution/ResolutionState";

export interface IAbilityEffect {
  readonly priority: number;
  execute(
    action: Action,
    allActions: Action[],
    match: Match,
    state: ResolutionState,
  ): void;
}
