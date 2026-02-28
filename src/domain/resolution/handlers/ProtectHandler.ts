import { AbilityId } from "../../entity/ability";
import { ResolutionStatus } from "../ResolutionState";
import { ResolutionHandler, ResolutionHandlerInput } from "./types";

export class ProtectHandler implements ResolutionHandler {
  readonly abilityId = AbilityId.Protect;

  execute(input: ResolutionHandlerInput): void {
    const { intent, context } = input;

    for (const targetId of intent.targetIds) {
      context.addStatus(ResolutionStatus.Protected, targetId, {
        sourceActorId: intent.actorId,
        sourceAbilityId: intent.abilityId,
        duration: "this_round",
      });

      context.emit({
        type: "player_protected",
        actorId: intent.actorId,
        targetId,
      });
    }
  }
}
