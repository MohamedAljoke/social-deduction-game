import { MatchRepository } from "../infrastructure/persistence/MatchRepository";
import { MatchNotFound } from "../domain/errors";
import { AbilityId } from "../domain/ability";

export class SubmitActionUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string, actorId: string, abilityId: AbilityId, targetIds: string[]) {
    const session = await this.repository.findById(matchId);

    if (!session) {
      throw new MatchNotFound();
    }

    session.match.submitAction(actorId, abilityId, targetIds);

    await this.repository.save(session);

    return {
      matchId,
      actorId,
      abilityId,
      targetIds,
    };
  }
}
