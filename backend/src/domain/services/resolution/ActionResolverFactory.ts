import { ActionResolver } from "./ActionResolver";
import { KillHandler } from "./handlers/KillHandler";
import { InvestigateHandler } from "./handlers/InvestigateHandler";
import { ProtectHandler } from "./handlers/ProtectHandler";
import { RoleBlockHandler } from "./handlers/RoleBlockHandler";

export class ActionResolverFactory {
  static create(): ActionResolver {
    const resolver = new ActionResolver();
    resolver.registerHandler(new KillHandler());
    resolver.registerHandler(new InvestigateHandler());
    resolver.registerHandler(new ProtectHandler());
    resolver.registerHandler(new RoleBlockHandler());
    return resolver;
  }
}
