import crypto from "node:crypto";
import { MatchNotFound, MatchAlreadyStarted } from "../domain/errors";
import { Match, MatchResponse, MatchStatus } from "../domain/entity/match";
import { Player } from "../domain/entity/player";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";

export interface JoinMatchInput {
  matchId: string;
  playerName: string;
}

export class JoinMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(input: JoinMatchInput): Promise<MatchResponse> {
    const match = await this.repository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    match.addPlayer(Player.create(input.playerName));
    await this.repository.save(match);

    return match.toJSON();
  }
}
