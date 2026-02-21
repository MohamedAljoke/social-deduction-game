import { Template } from "./template";

export class Player {
  private alive: boolean = true;
  private template: Template | null = null;

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

  public getTemplate(): Template | null {
    return this.template;
  }

  public assignTemplate(template: Template): void {
    this.template = template;
  }
}
