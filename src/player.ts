export class Player {
  private alive: boolean = true;

  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  public isAlive(): boolean {
    return this.alive;
  }

  public eliminate(): void {
    this.alive = false;
  }
}
