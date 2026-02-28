import { AbilityDefinition } from "../AbilityDefinition";
import { investigateAbilityDefinition } from "./investigate";
import { killAbilityDefinition } from "./kill";
import { protectAbilityDefinition } from "./protect";
import { roleblockAbilityDefinition } from "./roleblock";

export const defaultAbilityDefinitions: ReadonlyArray<AbilityDefinition> = [
  killAbilityDefinition,
  protectAbilityDefinition,
  roleblockAbilityDefinition,
  investigateAbilityDefinition,
];
