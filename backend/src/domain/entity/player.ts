export enum PlayerStatus {
  ALIVE = "alive",
  DEAD = "dead",
  ELIMINATED = "eliminated",
}

export type MatchPlayerStatus = "vote_shielded";

export type PlayerResponse = ReturnType<Player["toJSON"]>;

export class Player {
  readonly id: string;
  readonly name: string;
  private status: PlayerStatus;
  private templateId?: string;

  constructor(props: { id: string; name: string }) {
    this.id = props.id;
    this.name = props.name;
    this.status = PlayerStatus.ALIVE;
  }

  static create(name: string): Player {
    return new Player({
      id: crypto.randomUUID().toString(),
      name: name,
    });
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

  public assignTemplate(templateId: string): void {
    this.templateId = templateId;
  }

  public getTemplateId(): string | undefined {
    return this.templateId;
  }

  public resetForRematch(): void {
    this.status = PlayerStatus.ALIVE;
    this.templateId = undefined;
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      templateId: this.templateId,
    };
  }
}
