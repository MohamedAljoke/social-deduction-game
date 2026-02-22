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
}
