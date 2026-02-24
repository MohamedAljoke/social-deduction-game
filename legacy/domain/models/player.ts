import { AbilityId } from "./ability";
import { Action } from "./action";
import {
  AbilityDoesNotBelongToUser,
  MissingTemplate,
  PlayerIsDeadError,
} from "../errors";
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

  public act(abilityId: AbilityId, targetIds: string[]): Action {
    if (!this.template) {
      throw new MissingTemplate();
    }

    const ability = this.template.getAbility(abilityId);
    if (!ability) {
      throw new AbilityDoesNotBelongToUser();
    }

    if (!this.isAlive() && !ability.canUseWhenDead) {
      throw new PlayerIsDeadError();
    }

    const action = new Action(this.id, abilityId, targetIds);

    return action;
  }
}
