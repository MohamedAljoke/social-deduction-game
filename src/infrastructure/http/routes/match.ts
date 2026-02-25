import { Container, TOKENS } from "../../../container";
import { HttpServer } from "../server";

export function registerMatchRoutes(server: HttpServer, container: Container) {
  server.register("post", "/match", async (_, res) => {
    const useCase = container.resolve(TOKENS.CreateMatchUseCase);
    const result = await useCase.execute();
    res.status(201).json(result);
  });

  server.register("get", "/match", async (_, res) => {
    const useCase = container.resolve(TOKENS.ListMatchesUseCase);
    const result = await useCase.execute();
    res.status(200).json(result);
  });

  server.register("post", "/match/:matchId/join", async (req, res) => {
    const useCase = container.resolve(TOKENS.JoinMatchUseCase);
    const { matchId } = req.params;
    const { name, playerId } = req.body ?? {};

    const result = await useCase.execute({
      matchId,
      playerName: name,
      playerId,
    });

    res.status(200).json(result);
  });
}
