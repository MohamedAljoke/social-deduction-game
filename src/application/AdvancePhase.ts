import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { ActionResolver, ResolutionResult } from "../domain/services/ActionResolver";

export interface AdvancePhaseInput {
  matchId: string;
}

export interface AdvancePhaseResponse extends MatchResponse {
  resolution?: ResolutionResult;
}

export class AdvancePhaseUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly actionResolver: ActionResolver,
  ) {}

  async execute(input: AdvancePhaseInput): Promise<AdvancePhaseResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    const phase = match.advancePhase();
    const resolution =
      phase === "resolution"
        ? match.resolveActions(this.actionResolver)
        : undefined;

    await this.matchRepository.save(match);

    const matchResponse = match.toJSON();

    if (!resolution) {
      return matchResponse;
    }

    return {
      ...matchResponse,
      resolution,
    };
  }
}
