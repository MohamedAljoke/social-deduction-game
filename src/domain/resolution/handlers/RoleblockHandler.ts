import { AbilityId } from "../../entity/ability";
import { ResolutionStatus } from "../ResolutionState";
import { ResolutionHandler, ResolutionHandlerInput } from "./types";

export class RoleblockHandler implements ResolutionHandler {
  readonly abilityId = AbilityId.Roleblock;

  execute(input: ResolutionHandlerInput): void {
    const { intent, context } = input;

    for (const targetId of intent.targetIds) {
      context.addStatus(ResolutionStatus.Roleblocked, targetId, {
        sourceActorId: intent.actorId,
        sourceAbilityId: intent.abilityId,
        duration: "this_round",
      });

      context.emit({
        type: "player_roleblocked",
        actorId: intent.actorId,
        targetId,
      });
    }
  }
}
