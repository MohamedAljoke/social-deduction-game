import { Container, TOKENS } from "../../../container";
import {
  CreateMatchBody,
  CreateMatchSchema,
  JoinMatchBody,
  JoinMatchSchema,
  StartMatchBody,
  StartMatchSchema,
  SubmitVoteBody,
  SubmitVoteSchema,
  UseAbilityBody,
  UseAbilitySchema,
} from "../validators";
import { validateBody } from "../middlewares/validator";
import { HttpRequest, HttpServer } from "../server";

function playerToken(req: HttpRequest): string | undefined {
  const header = req.headers["x-player-token"];
  return Array.isArray(header) ? header[0] : header;
}

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
    const match = await useCase.execute({
      matchId: req.params.matchId,
      playerToken: playerToken(req),
    });

    res.status(200).json(match);
  });

  server.register("post", "/match/:matchId/rematch", async (req, res) => {
    const useCase = container.resolve(TOKENS.RematchMatchUseCase);
    const { matchId } = req.params;

    const result = await useCase.execute({ matchId, playerToken: playerToken(req) });

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
        playerToken: playerToken(req),
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
        playerToken: playerToken(req),
        EffectType: body.EffectType,
        targetIds: body.targetIds,
      });

      res.status(200).json(result);
    },
  );

  server.register(
    "post",
    "/match/:matchId/vote",
    validateBody(SubmitVoteSchema),
    async (req, res) => {
      const useCase = container.resolve(TOKENS.SubmitVoteUseCase);
      const { matchId } = req.params;
      const body: SubmitVoteBody = req.body;
      const result = await useCase.execute({
        matchId,
        playerToken: playerToken(req),
        targetId: body.targetId,
      });

      res.status(200).json(result);
    },
  );

  server.register("post", "/match/:matchId/phase", async (req, res) => {
    const useCase = container.resolve(TOKENS.AdvancePhaseUseCase);
    const { matchId } = req.params;

    const result = await useCase.execute({ matchId, playerToken: playerToken(req) });

    res.status(200).json(result);
  });

  server.register("post", "/match/:matchId/leave", async (req, res) => {
    const useCase = container.resolve(TOKENS.LeaveMatchUseCase);
    const { matchId } = req.params;

    const result = await useCase.execute({ matchId, playerToken: playerToken(req) });

    res.status(200).json(result);
  });
}
