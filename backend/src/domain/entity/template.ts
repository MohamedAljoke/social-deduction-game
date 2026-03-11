import { Ability, EffectType } from "./ability";

export enum Alignment {
  Villain = "villain",
  Hero = "hero",
  Neutral = "neutral",
}

export enum WinCondition {
  TeamParity = "team_parity",
  EliminateAlignment = "eliminate_alignment",
}

export interface WinConditionConfig {
  targetAlignment?: Alignment;
}

export class Template {
  constructor(
    readonly name: string,
    readonly id: string,
    readonly alignment: Alignment,
    readonly abilities: Ability[],
    readonly winCondition: WinCondition = WinCondition.TeamParity,
    readonly winConditionConfig?: WinConditionConfig,
  ) {}

  static default(id: string): Template {
    return new Template("Citizen", id, Alignment.Hero, []);
  }

  public getAbility(EffectType: EffectType): Ability | undefined {
    return this.abilities.find((ability) => ability.id == EffectType);
  }
}
