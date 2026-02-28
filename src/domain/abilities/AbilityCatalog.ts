import { AbilityId } from "../entity/ability";
import { AbilityDefinition } from "./AbilityDefinition";
import { defaultAbilityDefinitions } from "./definitions";
import { AbilityDefinitionNotFound } from "../errors";

export class AbilityCatalog {
  private readonly byId: Map<AbilityId, AbilityDefinition>;

  constructor(definitions: ReadonlyArray<AbilityDefinition>) {
    this.byId = new Map(definitions.map((definition) => [definition.id, definition]));
  }

  getDefinition(abilityId: AbilityId): AbilityDefinition {
    const definition = this.byId.get(abilityId);
    if (!definition) {
      throw new AbilityDefinitionNotFound(abilityId);
    }
    return definition;
  }

  hasDefinition(abilityId: AbilityId): boolean {
    return this.byId.has(abilityId);
  }

  listDefinitions(): ReadonlyArray<AbilityDefinition> {
    return Array.from(this.byId.values());
  }
}

export const defaultAbilityCatalog = new AbilityCatalog(defaultAbilityDefinitions);
