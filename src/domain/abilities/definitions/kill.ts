import { AbilityId } from "../../entity/ability";
import { AbilityDefinition } from "../AbilityDefinition";

export const killAbilityDefinition: AbilityDefinition = {
  id: AbilityId.Kill,
  handlerId: AbilityId.Kill,
  timingWindow: "main",
  priority: 10,
  allowedPhases: ["action"],
  tags: ["harmful", "targeted"],
  targeting: {
    canUseWhenDead: false,
    targetCount: 1,
    canTargetSelf: false,
    requiresAliveTarget: true,
  },
};
