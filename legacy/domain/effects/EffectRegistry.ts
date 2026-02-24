import { AbilityId } from "../models/ability";
import { IAbilityEffect } from "./IAbilityEffect";

export class EffectRegistry {
  private effects: Map<AbilityId, IAbilityEffect> = new Map();

  public register(abilityId: AbilityId, effect: IAbilityEffect): void {
    this.effects.set(abilityId, effect);
  }

  public getEffect(abilityId: AbilityId): IAbilityEffect | undefined {
    return this.effects.get(abilityId);
  }

  public hasEffect(abilityId: AbilityId): boolean {
    return this.effects.has(abilityId);
  }
}
