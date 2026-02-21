import { Ability, AbilityId } from "./ability";

export enum Alignment {
  Villain = "villain",
  Hero = "hero",
  Neutral = "neutral",
}

export class Template {
  constructor(
    public readonly id: string,
    public readonly alignment: Alignment,
    public readonly abilities: Ability[],
  ) {}

  public getAbility(abilityId: AbilityId): Ability | undefined {
    return this.abilities.find((ability) => ability.id == abilityId);
  }
}
