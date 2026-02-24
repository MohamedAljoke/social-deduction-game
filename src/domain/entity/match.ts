export enum MatchStatus {
  LOBBY = "lobby",
  STARTED = "started",
  FINISHED = "finished",
}

export type MatchResponse = ReturnType<Match["toJSON"]>;

export class Match {
  public readonly id: string;
  public name: string;
  public readonly createdAt: Date;
  private status: MatchStatus;

  constructor(props: { id: string; name: string; createdAt?: Date }) {
    this.id = props.id;
    this.name = props.name;
    this.createdAt = props.createdAt ?? new Date();
    this.status = MatchStatus.LOBBY;
  }

  public getStatus() {
    return this.status;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      status: this.status,
    };
  }
}
