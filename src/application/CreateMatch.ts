import crypto from "node:crypto";
import {
  MatchRepository,
  MatchSession,
} from "../domain/ports/persistance/MatchRepository";
import { Match, MatchStatus } from "../domain/entity/match";

export class CreateMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(): Promise<CreateMatchOutput> {
    const match = new Match();

    const session: MatchSession = {
      id: crypto.randomUUID().toString(),
      match,
      createdAt: new Date(),
    };

    await this.repository.save(session);

    return {
      id: session.id,
      status: MatchStatus.LOBBY,
      createdAt: session.createdAt,
    };
  }
}

export interface CreateMatchOutput {
  id: string;
  status: string;
  createdAt: Date;
}
