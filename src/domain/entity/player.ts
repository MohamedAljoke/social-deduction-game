export enum PlayerStatus {
  ALIVE = "alive",
  DEAD = "dead",
  ELIMINATED = "eliminated",
}

export type PlayerResponse = ReturnType<Player["toJSON"]>;

export class Player {
  public readonly id: string;
  public name: string;
  private status: PlayerStatus;

  constructor(props: { id: string; name: string }) {
    this.id = props.id;
    this.name = props.name;
    this.status = PlayerStatus.ALIVE;
  }

  public getStatus(): PlayerStatus {
    return this.status;
  }

  public kill(): void {
    this.status = PlayerStatus.DEAD;
  }

  public eliminate(): void {
    this.status = PlayerStatus.ELIMINATED;
  }

  public isAlive(): boolean {
    return this.status === PlayerStatus.ALIVE;
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
    };
  }
}
