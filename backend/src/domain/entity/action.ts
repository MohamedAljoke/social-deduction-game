import { AbilityId } from "./ability";

export class Action {
  public cancelled: boolean = false;

  constructor(
    readonly actorId: string,
    readonly abilityId: AbilityId,
    readonly targetIds: string[],
  ) {}
}
