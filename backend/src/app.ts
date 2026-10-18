import { buildContainer, TOKENS } from "./container";
import { MatchNotFound } from "./domain/errors";
import { ExpressServer } from "./infrastructure/http/express_adapter";
import { registerRoutes } from "./infrastructure/http/routes/route";
import { WebSocketManager } from "./infrastructure/websocket/mod";

export function createApp() {
  const ws = new WebSocketManager();
  const container = buildContainer(ws);
  const leaveMatchUseCase = container.resolve(TOKENS.LeaveMatchUseCase);
  const matchRepository = container.resolve(TOKENS.MatchRepository);

  const server = new ExpressServer(ws);

  ws.setJoinAuthorizer({
    async authorize(input) {
      const match = await matchRepository.findById(input.matchId);
      if (!match) {
        throw new MatchNotFound();
      }

      return match.identify(input.playerToken).toJSON();
    },
  });

  ws.setDisconnectHandler({
    handle(input) {
      return leaveMatchUseCase.execute(input).then(() => undefined);
    },
  });

  registerRoutes(server, container);

  return server;
}
