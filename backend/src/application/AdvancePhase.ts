import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";
import { MatchNotFound } from "../domain/errors";
import { MatchResponse, MatchStatus } from "../domain/entity/match";
import { ActionResolver } from "../domain/services/ActionResolver";

export interface AdvancePhaseInput {
  matchId: string;
}

export class AdvancePhaseUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly publisher: RealtimePublisher,
    private readonly actionResolver: ActionResolver,
  ) {}

  async execute(input: AdvancePhaseInput): Promise<MatchResponse> {
    const match = await this.matchRepository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    const newPhase = match.advancePhase();

    if (newPhase === "resolution") {
      const resolution = match.resolveActions(this.actionResolver);
      for (const effect of resolution.effects) {
        this.publisher.effectResolved(input.matchId, effect);
      }
    }

    await this.matchRepository.save(match);
    const result = match.toJSON();

    if (
      result.status === MatchStatus.FINISHED &&
      result.winnerAlignment !== null
    ) {
      this.publisher.matchUpdated(input.matchId, result);
      this.publisher.matchEnded(input.matchId, result.winnerAlignment);
      return result;
    }

    this.publisher.phaseChanged(input.matchId, newPhase);
    this.publisher.matchUpdated(input.matchId, result);

    return result;
  }
}
