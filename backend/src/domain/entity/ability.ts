import {
  CannotTargetSelf,
  InvalidTargetCount,
  PlayerIsDeadError,
  TargetNotAlive,
} from "../errors";
import { Player } from "./player";
import { ABILITY_DEFINITIONS } from "../../../../shared/src/ability-definitions";

export enum EffectType {
  Kill = "kill",
  Protect = "protect",
  Roleblock = "roleblock",
  Investigate = "investigate",
  VoteShield = "vote_shield",
}

export const DEFAULT_PRIORITY: Record<EffectType, number> = Object.fromEntries(
  Object.entries(ABILITY_DEFINITIONS).map(([id, def]) => [id, def.priority]),
) as Record<EffectType, number>;

export class Ability {
  constructor(
    readonly id: EffectType,
    readonly priority: number = DEFAULT_PRIORITY[id],
    readonly canUseWhenDead: boolean = false,
    readonly targetCount: number = 1,
    readonly canTargetSelf: boolean = false,
    readonly requiresAliveTarget: boolean = true,
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
