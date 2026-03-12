import { EffectType } from "./ability";
import {
  ABILITY_DEFINITIONS,
  type ResolutionStageId,
} from "../../../../shared/src/ability-definitions";

export enum ResolutionStage {
  TARGET_MUTATION = 0,
  DEFENSIVE = 1,
  CANCELLATION = 2,
  OFFENSIVE = 3,
  READ = 4,
}

const STAGE_ID_TO_ENUM: Record<ResolutionStageId, ResolutionStage> = {
  TARGET_MUTATION: ResolutionStage.TARGET_MUTATION,
  DEFENSIVE: ResolutionStage.DEFENSIVE,
  CANCELLATION: ResolutionStage.CANCELLATION,
  OFFENSIVE: ResolutionStage.OFFENSIVE,
  READ: ResolutionStage.READ,
};

export const DEFAULT_STAGE_BY_EFFECT: Record<EffectType, ResolutionStage> =
  Object.fromEntries(
    Object.entries(ABILITY_DEFINITIONS).map(([id, def]) => [
      id,
      STAGE_ID_TO_ENUM[def.stage],
    ]),
  ) as Record<EffectType, ResolutionStage>;

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
