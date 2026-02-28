import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { EffectType } from "../domain/entity/ability";

export interface UseAbilityInput {
  matchId: string;
  actorId: string;
  EffectType: EffectType;
  targetIds: string[];
}

export class UseAbilityUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(input: UseAbilityInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    match.useAbility(input.actorId, input.EffectType, input.targetIds);

    await this.matchRepository.save(match);

    return match.toJSON();
  }
}
