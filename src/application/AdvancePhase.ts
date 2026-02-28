import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { ActionResolver, ResolutionResult } from "../domain/services/ActionResolver";
import { VoteResult } from "../domain/entity/vote";

export interface AdvancePhaseInput {
  matchId: string;
}

export interface AdvancePhaseResponse extends MatchResponse {
  resolution?: ResolutionResult;
  voteResolution?: VoteResult[];
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

    const previousPhase = match.getPhase();
    const phase = match.advancePhase();

    let voteResolution: VoteResult[] | undefined;
    if (previousPhase === "voting" && phase === "action") {
      voteResolution = match.tallyVotes();
    }

    const resolution =
      phase === "resolution"
        ? match.resolveActions(this.actionResolver)
        : undefined;

    await this.matchRepository.save(match);

    const matchResponse = match.toJSON();

    const response: AdvancePhaseResponse = {
      ...matchResponse,
    };

    if (voteResolution) {
      response.voteResolution = voteResolution;
    }

    if (resolution) {
      response.resolution = resolution;
    }

    return response;
  }
}
