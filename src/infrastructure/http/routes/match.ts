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
    const { name } = req.body ?? {};

    const result = await useCase.execute({
      matchId,
      playerName: name,
    });

    res.status(200).json(result);
  });

  server.register("post", "/match/:matchId/start", async (req, res) => {
    const useCase = container.resolve(TOKENS.StartMatchUseCase);
    const { matchId } = req.params;
    const { templates } = req.body ?? {};

    const result = await useCase.execute({ matchId, templates });

    res.status(200).json(result);
  });
}
