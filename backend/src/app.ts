import { buildContainer, TOKENS } from "./container";
import { ExpressServer } from "./infrastructure/http/express_adapter";
import { registerRoutes } from "./infrastructure/http/routes/route";
import { wsManager } from "./infrastructure/websocket/mod";

export function createApp() {
  const container = buildContainer();
  const leaveMatchUseCase = container.resolve(TOKENS.LeaveMatchUseCase);

  const ws = wsManager({
    handle(input) {
      return leaveMatchUseCase.execute(input).then(() => undefined);
    },
  });
  const server = new ExpressServer(ws);

  registerRoutes(server, container);

  return server;
}
