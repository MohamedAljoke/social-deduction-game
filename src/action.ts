import { AbilityId } from "./ability";

export class Action {
  constructor(
    public readonly actionId: string,
    public readonly abilityId: AbilityId,
    public readonly targetIds: string[],
  ) {}
}
