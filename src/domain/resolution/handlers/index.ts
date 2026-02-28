import { AbilityId } from "../../entity/ability";
import { InvestigateHandler } from "./InvestigateHandler";
import { KillHandler } from "./KillHandler";
import { ProtectHandler } from "./ProtectHandler";
import { ResolutionHandler } from "./types";
import { RoleblockHandler } from "./RoleblockHandler";

export * from "./types";
export * from "./InvestigateHandler";
export * from "./KillHandler";
export * from "./ProtectHandler";
export * from "./RoleblockHandler";

export function createDefaultResolutionHandlers(): ReadonlyArray<ResolutionHandler> {
  return [
    new KillHandler(),
    new ProtectHandler(),
    new RoleblockHandler(),
    new InvestigateHandler(),
  ];
}

export function createResolutionHandlerMap(
  handlers: ReadonlyArray<ResolutionHandler>,
): ReadonlyMap<AbilityId, ResolutionHandler> {
  return new Map(handlers.map((handler) => [handler.abilityId, handler]));
}
