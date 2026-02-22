import { AbilityId } from "../ability";
import { EffectRegistry } from "./EffectRegistry";
import { KillEffect } from "./KillEffect";
import { ProtectEffect } from "./ProtectEffect";
import { RoleblockEffect } from "./RoleblockEffect";
import { InvestigateEffect } from "./InvestigateEffect";

export class AbilityEffectFactory {
  public static createRegistry(): EffectRegistry {
    const registry = new EffectRegistry();

    registry.register(AbilityId.Kill, new KillEffect());
    registry.register(AbilityId.Protect, new ProtectEffect());
    registry.register(AbilityId.Roleblock, new RoleblockEffect());
    registry.register(AbilityId.Investigate, new InvestigateEffect());

    return registry;
  }
}
