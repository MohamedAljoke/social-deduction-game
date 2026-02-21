import { AbilityId } from "../ability";

export type ResolutionEventType =
  | "killed"
  | "protected"
  | "kill_blocked"
  | "action_failed";

export interface ResolutionEvent {
  type: ResolutionEventType;
  actorId: string;
  targetIds: string[];
  abilityId: AbilityId;
  message?: string;
}
