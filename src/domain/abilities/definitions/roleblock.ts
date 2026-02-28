import { AbilityId } from "../../entity/ability";
import { AbilityDefinition } from "../AbilityDefinition";

export const roleblockAbilityDefinition: AbilityDefinition = {
  id: AbilityId.Roleblock,
  handlerId: AbilityId.Roleblock,
  timingWindow: "main",
  priority: 15,
  allowedPhases: ["action"],
  tags: ["control", "targeted"],
  targeting: {
    canUseWhenDead: false,
    targetCount: 1,
    canTargetSelf: false,
    requiresAliveTarget: true,
  },
};
