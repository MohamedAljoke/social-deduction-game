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
  UseAbilityBody,
  UseAbilitySchema,
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

  server.register("get", "/match/:matchId", async (req, res) => {
    const useCase = container.resolve(TOKENS.GetMatchUseCase);
    const match = await useCase.execute({ matchId: req.params.matchId });
    
    res.status(200).json(match);
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

  server.register(
    "post",
    "/match/:matchId/ability",
    validateBody(UseAbilitySchema),
    async (req, res) => {
      const useCase = container.resolve(TOKENS.UseAbilityUseCase);
      const { matchId } = req.params;
      const body: UseAbilityBody = req.body;

      const result = await useCase.execute({
        matchId,
        actorId: body.actorId,
        abilityId: body.abilityId,
        targetIds: body.targetIds,
      });

      res.status(200).json(result);
    },
  );

  server.register("post", "/match/:matchId/vote", async (req, res) => {
    const schema = z.object({
      voterId: z.string(),
      targetId: z.string().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid vote body" });
      return;
    }

    const useCase = container.resolve(TOKENS.SubmitVoteUseCase);
    const { matchId } = req.params;
    const result = await useCase.execute({
      matchId,
      voterId: parsed.data.voterId,
      targetId: parsed.data.targetId,
    });

    res.status(200).json(result);
  });

  server.register("post", "/match/:matchId/phase", async (req, res) => {
    const useCase = container.resolve(TOKENS.AdvancePhaseUseCase);
    const { matchId } = req.params;

    const result = await useCase.execute({ matchId });

    res.status(200).json(result);
  });

  server.register("post", "/match/:matchId/leave", async (req, res) => {
    const useCase = container.resolve(TOKENS.LeaveMatchUseCase);
    const { matchId } = req.params;
    const { playerId } = req.body as { playerId: string };

    const result = await useCase.execute({ matchId, playerId });

    res.status(200).json(result);
  });
}
