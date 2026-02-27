import { AbilityId } from "./ability";

export class Action {
  public cancelled: boolean = false;

  constructor(
    public readonly actorId: string,
    public readonly abilityId: AbilityId,
    public readonly targetIds: string[],
  ) {}
}
