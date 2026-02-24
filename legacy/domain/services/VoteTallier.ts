import { Vote } from "../models/vote";
import { PlayerRoster } from "./PlayerRoster";

export class VoteTallier {
  private voteQueue: Vote[] = [];
  private eliminatedThisRound: string | undefined = undefined;

  constructor(private playerRoster: PlayerRoster) {}

  submitVote(voterId: string, targetId: string): void {
    const voter = this.playerRoster.getPlayerByID(voterId);
    const target = this.playerRoster.getPlayerByID(targetId);

    if (!voter.isAlive()) {
      throw new Error("Dead players cannot vote");
    }

    if (!target.isAlive()) {
      throw new Error("Cannot vote for dead players");
    }

    this.voteQueue = this.voteQueue.filter((v) => v.voterId !== voterId);

    const vote = new Vote(voterId, targetId);
    this.voteQueue.push(vote);
  }

  tallyVotes(): string | undefined {
    this.eliminatedThisRound = undefined;

    if (this.voteQueue.length === 0) {
      return undefined;
    }

    const voteCounts = new Map<string, number>();
    for (const vote of this.voteQueue) {
      const currentCount = voteCounts.get(vote.targetId) || 0;
      voteCounts.set(vote.targetId, currentCount + 1);
    }

    let maxVotes = 0;
    let playersWithMaxVotes: string[] = [];

    for (const [playerId, count] of voteCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        playersWithMaxVotes = [playerId];
      } else if (count === maxVotes) {
        playersWithMaxVotes.push(playerId);
      }
    }

    if (playersWithMaxVotes.length === 1) {
      const target = playersWithMaxVotes[0];
      this.playerRoster.eliminatePlayer(target);
      this.eliminatedThisRound = target;
    }

    this.voteQueue = [];
    return this.eliminatedThisRound;
  }

  getEliminatedThisRound(): string | undefined {
    return this.eliminatedThisRound;
  }
}
