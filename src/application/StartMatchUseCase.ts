import { MatchRepository } from "../domain/repositories/MatchRepository";
import { TemplateRepository } from "../domain/repositories/TemplateRepository";
import { MatchStatus } from "../domain/match";
import {
  MatchNotFound,
  InsufficientPlayers,
  TemplateNotFound,
  MatchAlreadyStarted,
} from "../domain/errors";

export class StartMatchUseCase {
  constructor(
    private readonly repository: MatchRepository,
    private readonly templateRepository: TemplateRepository,
  ) {}

  async execute(matchId: string, templateIds: string[]) {
    const session = await this.repository.findById(matchId);

    if (!session) {
      throw new MatchNotFound();
    }

    const players = session.match.getPlayers();
    if (players.length < 2) {
      throw new InsufficientPlayers();
    }

    const templates = await this.templateRepository.findByIds(templateIds);

    if (templates.length !== templateIds.length) {
      throw new TemplateNotFound();
    }

    session.match.start(templates);

    await this.repository.save(session);

    return {
      matchId,
      status: session.match.getStatus(),
    };
  }
}
