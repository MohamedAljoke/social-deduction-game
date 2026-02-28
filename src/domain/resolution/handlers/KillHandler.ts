import { AbilityId } from "../../entity/ability";
import { ResolutionStatus } from "../ResolutionState";
import { ResolutionHandler, ResolutionHandlerInput } from "./types";

export class KillHandler implements ResolutionHandler {
  readonly abilityId = AbilityId.Kill;

  execute(input: ResolutionHandlerInput): void {
    const { intent, context } = input;

    for (const targetId of intent.targetIds) {
      const target = context.match.getPlayers().find((player) => player.id === targetId);
      if (!target || !target.isAlive()) {
        context.emit({
          type: "ability_failed",
          actorId: intent.actorId,
          abilityId: intent.abilityId,
          reason: "invalid_target",
        });
        continue;
      }

      if (context.hasStatus(ResolutionStatus.Protected, targetId)) {
        continue;
      }

      context.queueTransition({
        type: "kill_player",
        actorId: intent.actorId,
        abilityId: intent.abilityId,
        targetId,
      });

      context.emit({
        type: "player_killed",
        actorId: intent.actorId,
        targetId,
      });
    }
  }
}
