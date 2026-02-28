import { AbilityId } from "../../entity/ability";
import { Match } from "../../entity/match";
import { ResolutionState, ResolutionStatus, StatusRecord } from "../ResolutionState";
import { ActionIntent, ResolutionEvent, ResolutionTransition } from "../types";

export interface ResolutionHookDecision {
  readonly cancelled: boolean;
  readonly reason?: "actor_roleblocked";
}

export interface ResolutionExecutionContext {
  readonly match: Match;
  readonly state: ResolutionState;
  emit(event: ResolutionEvent): void;
  queueTransition(transition: ResolutionTransition): void;
  addStatus(status: ResolutionStatus, playerId: string, record: StatusRecord): void;
  hasStatus(status: ResolutionStatus, playerId: string): boolean;
}

export interface ResolutionHandlerInput {
  readonly intent: ActionIntent;
  readonly intents: ReadonlyArray<ActionIntent>;
  readonly context: ResolutionExecutionContext;
}

export interface ResolutionHandler {
  readonly abilityId: AbilityId;
  execute(input: ResolutionHandlerInput): void;
}

export type ResolutionHookPoint =
  | "beforeAction"
  | "beforeApply"
  | "afterApply"
  | "onDeath"
  | "endOfRound";

export interface ResolutionHookContext {
  readonly intent: ActionIntent;
  readonly match: Match;
  readonly state: ResolutionState;
}

export interface ResolutionHook {
  readonly id: string;
  readonly points: ReadonlyArray<ResolutionHookPoint>;
  run(point: ResolutionHookPoint, context: ResolutionHookContext): ResolutionHookDecision;
}
