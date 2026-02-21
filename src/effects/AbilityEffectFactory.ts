import { AbilityId } from "../ability";
import { EffectRegistry } from "./EffectRegistry";
import { KillEffect } from "./KillEffect";
import { ProtectEffect } from "./ProtectEffect";

export class AbilityEffectFactory {
  public static createRegistry(): EffectRegistry {
    const registry = new EffectRegistry();

    registry.register(AbilityId.Kill, new KillEffect());
    registry.register(AbilityId.Protect, new ProtectEffect());

    return registry;
  }
}
