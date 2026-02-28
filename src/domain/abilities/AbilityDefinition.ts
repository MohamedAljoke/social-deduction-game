import { AbilityId } from "../entity/ability";
import { PhaseType } from "../entity/phase";

export type AbilityTimingWindow = "pre" | "main" | "post";

export interface AbilityTargetingRules {
  readonly canUseWhenDead: boolean;
  readonly targetCount: number;
  readonly canTargetSelf: boolean;
  readonly requiresAliveTarget: boolean;
}

export interface AbilityDefinition {
  readonly id: AbilityId;
  readonly handlerId: AbilityId;
  readonly timingWindow: AbilityTimingWindow;
  readonly priority: number;
  readonly allowedPhases: ReadonlyArray<PhaseType>;
  readonly tags: ReadonlyArray<string>;
  readonly targeting: AbilityTargetingRules;
}
