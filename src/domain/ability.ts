export enum AbilityId {
  Kill = "kill",
  Protect = "protect",
}

export class Ability {
  constructor(
    public readonly id: AbilityId,
    public readonly canUseWhenDead: boolean = false,
  ) {}
}
