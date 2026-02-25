import crypto from "node:crypto";
import { MatchNotFound, MatchAlreadyStarted } from "../domain/errors";
import {
  Match,
  MatchResponse,
  MatchStatus,
} from "../domain/entity/match";
import { Player } from "../domain/entity/player";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";

export interface JoinMatchInput {
  matchId: string;
  playerName: string;
  playerId?: string;
}

export class JoinMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(input: JoinMatchInput): Promise<MatchResponse> {
    const match = await this.repository.findById(input.matchId);

    if (!match) {
      throw new MatchNotFound();
    }

    if (match.getStatus() !== MatchStatus.LOBBY) {
      throw new MatchAlreadyStarted();
    }

    const players = match.getPlayers();
    const playerId = input.playerId ?? crypto.randomUUID().toString();

    if (players.some((player) => player.id === playerId)) {
      // Id collision is unlikely, but if it happens we treat it as already joined.
      return match.toJSON();
    }

    if (players.some((player) => player.name === input.playerName)) {
      // Do not allow duplicate names within the same match lobby.
      return match.toJSON();
    }

    const newPlayer = new Player({
      id: playerId,
      name: input.playerName,
    });

    match.addPlayer(newPlayer);
    await this.repository.save(match);

    return match.toJSON();
  }
}

