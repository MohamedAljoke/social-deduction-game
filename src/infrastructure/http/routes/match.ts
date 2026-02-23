import { Container, TOKENS } from "../../../container";
import { HttpServer } from "../server";

export function registerMatchRoutes(server: HttpServer, container: Container) {
  server.register("post", "/", async (_, res) => {
    const useCase = container.resolve(TOKENS.CreateMatchUseCase);
    const result = await useCase.execute();
    res.status(201).json(result);
  });
}
