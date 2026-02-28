import { AbilityId } from "../../entity/ability";
import { AbilityDefinition } from "../AbilityDefinition";

export const investigateAbilityDefinition: AbilityDefinition = {
  id: AbilityId.Investigate,
  handlerId: AbilityId.Investigate,
  timingWindow: "main",
  priority: 5,
  allowedPhases: ["action"],
  tags: ["information", "targeted"],
  targeting: {
    canUseWhenDead: false,
    targetCount: 1,
    canTargetSelf: false,
    requiresAliveTarget: true,
  },
};
