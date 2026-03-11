import { buildContainer, TOKENS } from "./container";
import { ExpressServer } from "./infrastructure/http/express_adapter";
import { registerRoutes } from "./infrastructure/http/routes/route";
import { WebSocketManager } from "./infrastructure/websocket/mod";

export function createApp() {
  const ws = new WebSocketManager();
  const container = buildContainer(ws);
  const leaveMatchUseCase = container.resolve(TOKENS.LeaveMatchUseCase);

  const server = new ExpressServer(ws);

  ws.setDisconnectHandler({
    handle(input) {
      return leaveMatchUseCase.execute(input).then(() => undefined);
    },
  });

  registerRoutes(server, container);

  return server;
}
