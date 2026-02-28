import { EffectType } from "../entity/ability";
import { Action } from "../entity/action";
import { Player } from "../entity/player";
import { Template } from "../entity/template";
import { ResolutionContext } from "./ResolutionContext";

export enum ResolutionStage {
  TARGET_MUTATION = 0,
  DEFENSIVE = 1,
  CANCELLATION = 2,
  OFFENSIVE = 3,
  READ = 4,
}

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
