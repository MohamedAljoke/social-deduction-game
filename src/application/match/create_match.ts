import { z } from "zod";
import crypto from "node:crypto";
import {
  MatchRepository,
  MatchSession,
} from "../../infrastructure/persistence/MatchRepository";
import { Match, MatchStatus } from "../../domain/match";

export class CreateMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(): Promise<CreateMatchOutput> {
    const match = new Match();

    const session: MatchSession = {
      id: crypto.randomUUID().toString(),
      status: MatchStatus.LOBBY,
      match,
      createdAt: new Date(),
    };

    await this.repository.save(session);

    return {
      id: session.id,
      status: session.status,
      createdAt: session.createdAt,
    };
  }
}

export interface CreateMatchOutput {
  id: string;
  status: string;
  createdAt: Date;
}
