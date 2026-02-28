import { AbilityId } from "../../entity/ability";
import { AbilityDefinition } from "../AbilityDefinition";

export const protectAbilityDefinition: AbilityDefinition = {
  id: AbilityId.Protect,
  handlerId: AbilityId.Protect,
  timingWindow: "main",
  priority: 20,
  allowedPhases: ["action"],
  tags: ["defensive", "targeted"],
  targeting: {
    canUseWhenDead: false,
    targetCount: 1,
    canTargetSelf: false,
    requiresAliveTarget: true,
  },
};
