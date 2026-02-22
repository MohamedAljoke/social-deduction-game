import { Router } from "express";
import { z } from "zod";
import { AbilityId } from "../../domain/ability";
import { CreateMatchUseCase } from "../../application/match/create_match";
import { JoinMatchUseCase } from "../../application/JoinMatchUseCase";
import { GetMatchUseCase } from "../../application/GetMatchUseCase";
import { GetPlayerRoleUseCase } from "../../application/GetPlayerRoleUseCase";
import { StartMatchUseCase } from "../../application/StartMatchUseCase";
import { SubmitActionUseCase } from "../../application/SubmitActionUseCase";
import { SubmitVoteUseCase } from "../../application/SubmitVoteUseCase";
import { AdvancePhaseUseCase } from "../../application/AdvancePhaseUseCase";
import { handleError } from "../middleware";

export type MatchDeps = {
  createMatch: CreateMatchUseCase;
  joinMatch: JoinMatchUseCase;
  getMatch: GetMatchUseCase;
  getPlayerRole: GetPlayerRoleUseCase;
  startMatch: StartMatchUseCase;
  submitAction: SubmitActionUseCase;
  submitVote: SubmitVoteUseCase;
  advancePhase: AdvancePhaseUseCase;
};

const joinSchema = z.object({
  playerName: z.string().min(1),
});

const startSchema = z.object({
  templateIds: z.array(z.string()),
});

const submitActionSchema = z.object({
  actorId: z.string(),
  abilityId: z.enum(["kill", "protect"]),
  targetIds: z.array(z.string()),
});

const submitVoteSchema = z.object({
  voterId: z.string(),
  targetId: z.string(),
});

export function createMatchRouter(deps: MatchDeps): Router {
  const router = Router();

  router.post("/", async (_req, res) => {
    const result = await deps.createMatch.execute();
    res.status(201).json(result);
  });

  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await deps.getMatch.execute(id);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get("/:matchId/players/:playerId/role", async (req, res) => {
    const { matchId, playerId } = req.params;
    try {
      const result = await deps.getPlayerRole.execute(matchId, playerId);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post("/:id/join", async (req, res) => {
    const { id } = req.params;
    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error });
      return;
    }
    try {
      const result = await deps.joinMatch.execute(id, parsed.data.playerName);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post("/:id/start", async (req, res) => {
    const { id } = req.params;
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error });
      return;
    }
    try {
      const result = await deps.startMatch.execute(id, parsed.data.templateIds);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post("/:id/actions", async (req, res) => {
    const { id } = req.params;
    const parsed = submitActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error });
      return;
    }
    try {
      const result = await deps.submitAction.execute(
        id,
        parsed.data.actorId,
        parsed.data.abilityId as AbilityId,
        parsed.data.targetIds,
      );
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post("/:id/votes", async (req, res) => {
    const { id } = req.params;
    const parsed = submitVoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error });
      return;
    }
    try {
      const result = await deps.submitVote.execute(
        id,
        parsed.data.voterId,
        parsed.data.targetId,
      );
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post("/:id/advance-phase", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await deps.advancePhase.execute(id);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}
