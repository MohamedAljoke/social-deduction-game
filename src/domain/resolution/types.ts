import { AbilityTimingWindow } from "../abilities";
import { AbilityId } from "../entity/ability";
import { Alignment } from "../entity/template";

export interface ActionIntent {
  readonly actionId: string;
  readonly actorId: string;
  readonly abilityId: AbilityId;
  readonly targetIds: ReadonlyArray<string>;
  readonly timingWindow: AbilityTimingWindow;
  readonly priority: number;
}

export type ResolutionFailureReason =
  | "actor_roleblocked"
  | "handler_missing"
  | "invalid_target";

export interface PlayerProtectedEvent {
  readonly type: "player_protected";
  readonly actorId: string;
  readonly targetId: string;
}

export interface PlayerRoleblockedEvent {
  readonly type: "player_roleblocked";
  readonly actorId: string;
  readonly targetId: string;
}

export interface PlayerKilledEvent {
  readonly type: "player_killed";
  readonly actorId: string;
  readonly targetId: string;
}

export interface InvestigationResultEvent {
  readonly type: "investigation_result";
  readonly actorId: string;
  readonly targetId: string;
  readonly alignment: Alignment;
}

export interface AbilityFailedEvent {
  readonly type: "ability_failed";
  readonly actorId: string;
  readonly abilityId: AbilityId;
  readonly reason: ResolutionFailureReason;
}

export type ResolutionEvent =
  | PlayerProtectedEvent
  | PlayerRoleblockedEvent
  | PlayerKilledEvent
  | InvestigationResultEvent
  | AbilityFailedEvent;

export interface KillPlayerTransition {
  readonly type: "kill_player";
  readonly actorId: string;
  readonly abilityId: AbilityId;
  readonly targetId: string;
}

export type ResolutionTransition = KillPlayerTransition;

export interface ResolutionResult {
  readonly events: ReadonlyArray<ResolutionEvent>;
  readonly transitions: ReadonlyArray<ResolutionTransition>;
  readonly intents: ReadonlyArray<ActionIntent>;
}

export const TIMING_WINDOW_ORDER: Record<AbilityTimingWindow, number> = {
  pre: 0,
  main: 1,
  post: 2,
};
