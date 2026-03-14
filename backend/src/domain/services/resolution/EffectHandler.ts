import { EffectType } from "../../entity/ability";
import { Action } from "../../entity/action";
import { Player } from "../../entity/player";
import { Template } from "../../entity/template";
import { ResolutionContext } from "./ResolutionContext";

export interface EffectHandler {
  readonly effectType: EffectType | string;
  resolve(
    action: Action,
    ctx: ResolutionContext,
    players: Map<string, Player>,
    templates?: Template[],
  ): void;
}
