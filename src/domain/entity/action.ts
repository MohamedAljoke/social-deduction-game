import { EffectType } from "./ability";
import { ResolutionStage } from "../services/EffectHandler";

export class Action {
  public cancelled: boolean = false;

  constructor(
    public readonly actorId: string,
    public readonly effectType: EffectType,
    public readonly priority: number,
    public readonly stage: ResolutionStage,
    public readonly targetIds: string[],
  ) {}
}
