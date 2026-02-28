import { Ability, EffectType } from "./ability";

export enum Alignment {
  Villain = "villain",
  Hero = "hero",
  Neutral = "neutral",
}

export type WinCondition = "default" | "vote_eliminated";

export class Template {
  constructor(
    public readonly id: string,
    public readonly alignment: Alignment,
    public readonly abilities: Ability[],
    public readonly winCondition: WinCondition = "default",
    public readonly endsGameOnWin: boolean = true,
  ) {}

  public getAbility(EffectType: EffectType): Ability | undefined {
    return this.abilities.find((ability) => ability.id == EffectType);
  }
}
