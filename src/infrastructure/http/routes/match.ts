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
}
