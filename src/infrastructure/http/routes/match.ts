import { z } from "zod";
import { Container, TOKENS } from "../../../container";
import { HttpServer } from "../server";
import {
  CreateMatchBody,
  CreateMatchSchema,
  JoinMatchBody,
  JoinMatchSchema,
  StartMatchBody,
  StartMatchSchema,
} from "../validators";
import { validateBody } from "../middlewares/validator";

export function registerMatchRoutes(server: HttpServer, container: Container) {
  server.register(
    "post",
    "/match",
    validateBody(CreateMatchSchema),
    async (req, res) => {
      const body: CreateMatchBody = req.body;

      const useCase = container.resolve(TOKENS.CreateMatchUseCase);
      const result = await useCase.execute(body);
      res.status(201).json(result);
    },
  );

  server.register("get", "/match", async (_, res) => {
    const useCase = container.resolve(TOKENS.ListMatchesUseCase);
    const result = await useCase.execute();
    res.status(200).json(result);
  });

  server.register(
    "post",
    "/match/:matchId/join",
    validateBody(JoinMatchSchema),
    async (req, res) => {
      const useCase = container.resolve(TOKENS.JoinMatchUseCase);
      const { matchId } = req.params;
      const body: JoinMatchBody = req.body;

      const result = await useCase.execute({
        matchId,
        playerName: body.name,
      });

      res.status(200).json(result);
    },
  );

  server.register(
    "post",
    "/match/:matchId/start",
    validateBody(StartMatchSchema),
    async (req, res) => {
      const useCase = container.resolve(TOKENS.StartMatchUseCase);
      const { matchId } = req.params;
      const body: StartMatchBody = req.body;

      const result = await useCase.execute({
        matchId,
        templates: body.templates,
      });

      res.status(200).json(result);
    },
  );
}
