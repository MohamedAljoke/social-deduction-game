import { AbilityId } from "../ability";

export type ResolutionEventType =
  | "killed"
  | "protected"
  | "kill_blocked"
  | "action_failed"
  | "investigated";

export interface ResolutionEvent {
  type: ResolutionEventType;
  actorId: string;
  targetIds: string[];
  abilityId: AbilityId;
  message?: string;
}

export interface ResolutionContext {
  killPlayer(id: string): void;
  isPlayerAlive(id: string): boolean;
  getPlayerAlignment(id: string): string;
  emit(event: ResolutionEvent): void;
}
