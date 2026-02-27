import {
  CannotTargetSelf,
  InvalidTargetCount,
  PlayerIsDeadError,
  TargetNotAlive,
} from "../errors";
import { Player } from "./player";

export enum AbilityId {
  Kill = "kill",
  Protect = "protect",
  Roleblock = "roleblock",
  Investigate = "investigate",
}

export class Ability {
  constructor(
    public readonly id: AbilityId,
    public readonly canUseWhenDead: boolean = false,
    public readonly targetCount: number = 1,
    public readonly canTargetSelf: boolean = false,
    public readonly requiresAliveTarget: boolean = true,
  ) {}

  validateUsage(params: { actor: Player; targets: Player[] }): void {
    const { actor, targets } = params;

    if (!actor.isAlive() && !this.canUseWhenDead) {
      throw new PlayerIsDeadError();
    }

    if (targets.length !== this.targetCount) {
      throw new InvalidTargetCount(this.targetCount, targets.length);
    }

    for (const target of targets) {
      if (target.id === actor.id && !this.canTargetSelf) {
        throw new CannotTargetSelf();
      }

      if (this.requiresAliveTarget && !target.isAlive()) {
        throw new TargetNotAlive();
      }
    }
  }
}
