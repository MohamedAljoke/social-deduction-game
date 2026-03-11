import {
  PlayerIsDeadError,
  PlayerNotInMatch,
  TargetNotAlive,
} from "../../errors";
import { Phase } from "../../entity/phase";
import { Player } from "../../entity/player";

export interface VoteResolutionResult {
  eliminatedPlayerId: string | null;
  playerEliminatedThisRound: boolean;
}

type VoteRecord = { voterId: string; targetId: string | null };

export class MatchVoting {
  private votes: VoteRecord[];

  constructor(votes: VoteRecord[] = []) {
    this.votes = [...votes];
  }

  public submitVote(
    phase: Phase,
    players: Player[],
    voterId: string,
    targetId: string | null,
  ): void {
    phase.assertCanVote();

    const playersById = new Map(players.map((player) => [player.id, player]));
    const voter = playersById.get(voterId);

    if (!voter) {
      throw new PlayerNotInMatch();
    }

    if (!voter.isAlive()) {
      throw new PlayerIsDeadError();
    }

    if (targetId !== null) {
      const target = playersById.get(targetId);
      if (!target) {
        throw new PlayerNotInMatch();
      }

      if (!target.isAlive()) {
        throw new TargetNotAlive();
      }
    }

    const existing = this.votes.findIndex((vote) => vote.voterId === voterId);
    if (existing !== -1) {
      this.votes[existing] = { voterId, targetId };
      return;
    }

    this.votes.push({ voterId, targetId });
  }

  public resolveRound(): VoteResolutionResult {
    const skipCount = this.votes.filter((vote) => vote.targetId === null).length;
    const tally = new Map<string, number>();

    for (const { targetId } of this.votes) {
      if (targetId === null) {
        continue;
      }

      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
    }

    let eliminatedPlayerId: string | null = null;
    if (tally.size > 0) {
      const [topTarget, topCount] = [...tally.entries()].reduce((a, b) =>
        b[1] > a[1] ? b : a,
      );
      const isTied = [...tally.values()].filter((count) => count === topCount)
        .length > 1;

      if (!isTied && topCount > skipCount) {
        eliminatedPlayerId = topTarget;
      }
    }

    return {
      eliminatedPlayerId,
      playerEliminatedThisRound: eliminatedPlayerId !== null,
    };
  }

  public clear(): void {
    this.votes = [];
  }

  public getVotes(): Array<{ voterId: string; targetId: string | null }> {
    return [...this.votes];
  }
}
