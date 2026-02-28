import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { MatchNotFound, MatchNotStarted } from "../domain/errors";
import { MatchResponse } from "../domain/entity/match";
import { CheckWinConditions } from "../domain/services/CheckWinConditions";
import { InvalidPhase } from "../domain/errors";
import {
  applyResolutionTransitions,
  ResolutionEngine,
} from "../domain/resolution";

export interface ResolveActionsInput {
  matchId: string;
}

export class ResolveActionsUseCase {
  private readonly resolutionEngine: ResolutionEngine;
  private readonly winConditionChecker: CheckWinConditions;

  constructor(private readonly matchRepository: MatchRepository) {
    this.resolutionEngine = new ResolutionEngine();
    this.winConditionChecker = new CheckWinConditions();
  }

  async execute(input: ResolveActionsInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    if (match.getStatus() !== "started") {
      throw new MatchNotStarted();
    }

    if (match.getPhase() !== "resolution") {
      throw new InvalidPhase();
    }

    const resolution = this.resolutionEngine.resolve(match);
    applyResolutionTransitions(match, resolution.transitions);

    match.clearActions();

    const winResult = this.winConditionChecker.check(match);
    if (winResult.hasWinner) {
      match.setFinished();
    }

    await this.matchRepository.save(match);

    return match.toJSON();
  }
}
