import { EffectType } from "../entity/ability";
import { Action, ResolutionStage } from "../entity/action";
import { Player } from "../entity/player";
import { Template } from "../entity/template";
import { ResolutionContext } from "./ResolutionContext";

export interface EffectHandler {
  readonly effectType: EffectType | string;
  readonly stage: ResolutionStage;
  resolve(
    action: Action,
    ctx: ResolutionContext,
    players: Map<string, Player>,
    templates?: Template[],
  ): void;
}
