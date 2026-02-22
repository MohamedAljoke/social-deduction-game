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
  ) {}
}
