import { AbilityId } from "../entity/ability";

export enum ResolutionStatus {
  Protected = "protected",
  Roleblocked = "roleblocked",
}

export type ResolutionDuration = "this_round" | "next_round" | "persistent";

export interface StatusRecord {
  readonly sourceActorId: string;
  readonly sourceAbilityId: AbilityId;
  readonly duration: ResolutionDuration;
}

export class ResolutionState {
  private readonly statuses = new Map<ResolutionStatus, Map<string, StatusRecord[]>>();

  addStatus(
    status: ResolutionStatus,
    playerId: string,
    record: StatusRecord,
  ): void {
    const players = this.getPlayersMap(status);
    const entries = players.get(playerId) ?? [];
    players.set(playerId, [...entries, record]);
  }

  hasStatus(status: ResolutionStatus, playerId: string): boolean {
    return this.getStatusRecords(status, playerId).length > 0;
  }

  getStatusRecords(
    status: ResolutionStatus,
    playerId: string,
  ): ReadonlyArray<StatusRecord> {
    const players = this.statuses.get(status);
    if (!players) {
      return [];
    }

    return players.get(playerId) ?? [];
  }

  private getPlayersMap(
    status: ResolutionStatus,
  ): Map<string, StatusRecord[]> {
    const players = this.statuses.get(status);
    if (players) {
      return players;
    }

    const nextPlayers = new Map<string, StatusRecord[]>();
    this.statuses.set(status, nextPlayers);
    return nextPlayers;
  }
}
