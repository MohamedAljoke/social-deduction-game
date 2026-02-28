export type Vote = Readonly<{
  voterId: string;
  targetId: string;
  timestamp: Date;
  round: number;
}>;

export interface VoteCount {
  candidateId: string;
  count: number;
}

export enum VoteResultType {
  ELIMINATED = "eliminated",
  NO_ELIMINATION = "no_elimination",
  TIE = "tie",
}

export interface VoteResult extends VoteCount {
  round: number;
  resultType: VoteResultType;
}

export interface VoteRoundSummary {
  round: number;
  totalVotes: number;
  counts: VoteCount[];
  resolution: VoteResult[];
  resolvedAt: Date;
}

export function createVote(
  voterId: string,
  targetId: string,
  round: number,
  timestamp: Date = new Date(),
): Vote {
  return Object.freeze({
    voterId,
    targetId,
    round,
    timestamp,
  });
}

export class VoteSummary {
  private votesByTarget: Map<string, number>;

  constructor(private readonly votes: Vote[]) {
    this.votesByTarget = new Map();

    for (const vote of votes) {
      const currentCount = this.votesByTarget.get(vote.targetId) ?? 0;
      this.votesByTarget.set(vote.targetId, currentCount + 1);
    }
  }

  tallyCounts(): VoteCount[] {
    return Array.from(this.votesByTarget.entries())
      .map(([candidateId, count]) => ({
        candidateId,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.candidateId.localeCompare(b.candidateId));
  }

  resolve(round: number): VoteResult[] {
    const counts = this.tallyCounts();
    if (counts.length === 0) {
      return [];
    }

    const highest = counts[0].count;
    const topCandidates = counts.filter((result) => result.count === highest);

    if (topCandidates.length > 1) {
      return topCandidates.map((result) => ({
        ...result,
        round,
        resultType: VoteResultType.TIE,
      }));
    }

    return topCandidates.map((result) => ({
      ...result,
      round,
      resultType: VoteResultType.ELIMINATED,
    }));
  }

  getTotalVotes(): number {
    return this.votes.length;
  }
}
