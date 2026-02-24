import { Router } from "express";
import { z } from "zod";
import { Alignment } from "../../domain/models/template";
import { AbilityId } from "../../domain/models/ability";
import { CreateTemplateUseCase } from "../../application/CreateTemplateUseCase";
import { ListTemplatesUseCase } from "../../application/ListTemplatesUseCase";
import { GetTemplateUseCase } from "../../application/GetTemplateUseCase";
import { handleError } from "../middleware";

export type TemplateDeps = {
  createTemplate: CreateTemplateUseCase;
  listTemplates: ListTemplatesUseCase;
  getTemplate: GetTemplateUseCase;
};

const abilityIdValues = Object.values(AbilityId) as [string, ...string[]];

const templateSchema = z.object({
  alignment: z.enum(["villain", "hero", "neutral"]),
  abilities: z.array(z.object({
    id: z.enum(abilityIdValues),
    canUseWhenDead: z.boolean().optional(),
  })),
  winCondition: z.enum(["default", "vote_eliminated"]).optional(),
  endsGameOnWin: z.boolean().optional(),
});

export function createTemplateRouter(deps: TemplateDeps): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const result = await deps.listTemplates.execute();
    res.json(result);
  });

  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await deps.getTemplate.execute(id);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post("/", async (req, res) => {
    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error });
      return;
    }
    try {
      const input = {
        alignment: parsed.data.alignment as Alignment,
        abilities: parsed.data.abilities.map(a => ({
          id: a.id as AbilityId,
          canUseWhenDead: a.canUseWhenDead ?? false,
        })),
        winCondition: parsed.data.winCondition,
        endsGameOnWin: parsed.data.endsGameOnWin,
      };
      const result = await deps.createTemplate.execute(input);
      res.status(201).json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}
