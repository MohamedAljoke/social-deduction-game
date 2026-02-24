import crypto from "node:crypto";
import { MatchRepository } from "../domain/ports/persistance/MatchRepository";
import { Match } from "../domain/entity/match";

export class CreateMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(): Promise<CreateMatchOutput> {
    const match = new Match({
      id: crypto.randomUUID().toString(),
      name: "match_one",
    });

    await this.repository.save(match);

    return {
      id: match.id,
      status: match.getStatus(),
      createdAt: match.createdAt,
    };
  }
}

export interface CreateMatchOutput {
  id: string;
  status: string;
  createdAt: Date;
}
