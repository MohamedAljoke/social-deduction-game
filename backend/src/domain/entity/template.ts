import { Ability, AbilityId } from "./ability";

export enum Alignment {
  Villain = "villain",
  Hero = "hero",
  Neutral = "neutral",
}

export type WinCondition = "default" | "vote_eliminated";

export class Template {
  constructor(
    readonly name: string,
    readonly id: string,
    readonly alignment: Alignment,
    readonly abilities: Ability[],
    readonly winCondition: WinCondition = "default",
    readonly endsGameOnWin: boolean = true,
  ) {}

  static default(id: string): Template {
    return new Template("", id, Alignment.Hero, []);
  }

  public getAbility(abilityId: AbilityId): Ability | undefined {
    return this.abilities.find((ability) => ability.id == abilityId);
  }
}
