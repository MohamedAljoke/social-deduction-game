import { buildContainer } from "./container";
import { ExpressServer } from "./infrastructure/http/express_adapter";
import { registerRoutes } from "./infrastructure/http/routes/route";

export function createApp() {
  const server = new ExpressServer();
  const container = buildContainer();

  registerRoutes(server, container);

  return server;
}
