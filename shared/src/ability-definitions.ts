export type EffectTypeId =
  | "kill"
  | "protect"
  | "roleblock"
  | "investigate"
  | "vote_shield";

export type ResolutionStageId =
  | "TARGET_MUTATION"
  | "DEFENSIVE"
  | "CANCELLATION"
  | "OFFENSIVE"
  | "READ";

export interface AbilityDefinition {
  id: EffectTypeId;
  stage: ResolutionStageId;
  priority: number;
  canUseWhenDead: boolean;
  targetCount: number;
  canTargetSelf: boolean;
  requiresAliveTarget: boolean;
  label: string;
  verb: string;
}

export const ABILITY_DEFINITIONS: Record<EffectTypeId, AbilityDefinition> = {
  kill: {
    id: "kill",
    stage: "OFFENSIVE",
    priority: 0,
    canUseWhenDead: false,
    targetCount: 1,
    canTargetSelf: false,
    requiresAliveTarget: true,
    label: "Kill",
    verb: "killed",
  },
  protect: {
    id: "protect",
    stage: "DEFENSIVE",
    priority: 2,
    canUseWhenDead: false,
    targetCount: 1,
    canTargetSelf: true,
    requiresAliveTarget: true,
    label: "Protect",
    verb: "protected",
  },
  vote_shield: {
    id: "vote_shield",
    stage: "DEFENSIVE",
    priority: 2,
    canUseWhenDead: false,
    targetCount: 1,
    canTargetSelf: true,
    requiresAliveTarget: true,
    label: "Vote Shield",
    verb: "shielded from voting",
  },
  roleblock: {
    id: "roleblock",
    stage: "CANCELLATION",
    priority: 3,
    canUseWhenDead: false,
    targetCount: 1,
    canTargetSelf: false,
    requiresAliveTarget: true,
    label: "Roleblock",
    verb: "roleblocked",
  },
  investigate: {
    id: "investigate",
    stage: "READ",
    priority: 1,
    canUseWhenDead: false,
    targetCount: 1,
    canTargetSelf: false,
    requiresAliveTarget: true,
    label: "Investigate",
    verb: "investigated",
  },
};
