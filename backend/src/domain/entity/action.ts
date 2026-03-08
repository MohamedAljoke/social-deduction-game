import { EffectType } from "./ability";

export enum ResolutionStage {
  TARGET_MUTATION = 0,
  DEFENSIVE = 1,
  CANCELLATION = 2,
  OFFENSIVE = 3,
  READ = 4,
}

export const DEFAULT_STAGE_BY_EFFECT: Record<EffectType, ResolutionStage> = {
  [EffectType.Kill]: ResolutionStage.OFFENSIVE,
  [EffectType.Protect]: ResolutionStage.DEFENSIVE,
  [EffectType.Roleblock]: ResolutionStage.CANCELLATION,
  [EffectType.Investigate]: ResolutionStage.READ,
};

export class Action {
  public cancelled: boolean = false;

  constructor(
    readonly actorId: string,
    readonly effectType: EffectType,
    readonly priority: number,
    readonly stage: ResolutionStage,
    readonly targetIds: string[],
  ) {}
}
