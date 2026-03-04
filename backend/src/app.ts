import { buildContainer, TOKENS } from "./container";
import { ExpressServer } from "./infrastructure/http/express_adapter";
import { registerRoutes } from "./infrastructure/http/routes/route";
import { wsManager } from "./infrastructure/websocket/mod";

export function createApp() {
  const container = buildContainer();

  const ws = wsManager(container.resolve(TOKENS.LeaveMatchUseCase));
  const server = new ExpressServer(ws);

  registerRoutes(server, container);

  return server;
}
