import { Ability, AbilityId } from "./ability";

export enum Alignment {
  Villain = "villain",
  Hero = "hero",
  Neutral = "neutral",
}

export type WinCondition = "default" | "vote_eliminated";

export class Template {
  constructor(
    readonly id: string,
    readonly alignment: Alignment,
    readonly abilities: Ability[],
    readonly winCondition: WinCondition = "default",
    readonly endsGameOnWin: boolean = true,
  ) {}

  public getAbility(abilityId: AbilityId): Ability | undefined {
    return this.abilities.find((ability) => ability.id == abilityId);
  }
}
