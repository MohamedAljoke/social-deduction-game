import express from "express";
import { z } from "zod";
import { Alignment } from "./domain/template";
import { AbilityId } from "./domain/ability";
import { CreateMatchUseCase } from "./application/match/create_match";
import { JoinMatchUseCase } from "./application/JoinMatchUseCase";
import { CreateTemplateUseCase } from "./application/CreateTemplateUseCase";
import { StartMatchUseCase } from "./application/StartMatchUseCase";
import { SubmitActionUseCase } from "./application/SubmitActionUseCase";
import { AdvancePhaseUseCase } from "./application/AdvancePhaseUseCase";
import { GetMatchUseCase } from "./application/GetMatchUseCase";
import { InMemoryMatchRepository } from "./infrastructure/persistence/InMemoryMatchRepository";
import { InMemoryTemplateRepository } from "./infrastructure/persistence/InMemoryTemplateRepository";
import { MatchRepository } from "./infrastructure/persistence/MatchRepository";
import { TemplateRepository } from "./infrastructure/persistence/TemplateRepository";
import { DomainError } from "./domain/errors";

const app = express();
app.use(express.json());

const matchRepository: MatchRepository = new InMemoryMatchRepository();
const templateRepository: TemplateRepository = new InMemoryTemplateRepository();

const createMatchUseCase = new CreateMatchUseCase(matchRepository);
const joinMatchUseCase = new JoinMatchUseCase(matchRepository);
const createTemplateUseCase = new CreateTemplateUseCase(templateRepository);
const startMatchUseCase = new StartMatchUseCase(matchRepository, templateRepository);
const submitActionUseCase = new SubmitActionUseCase(matchRepository);
const advancePhaseUseCase = new AdvancePhaseUseCase(matchRepository);
const getMatchUseCase = new GetMatchUseCase(matchRepository);

const handleError = (err: unknown, res: express.Response) => {
  if (err instanceof DomainError) {
    const status = err.code === "match_not_found" ? 404 : 400;
    res.status(status).json({ error: err.message, code: err.code });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
};

app.post("/matches", async (req, res) => {
  const result = await createMatchUseCase.execute();
  res.status(201).json(result);
});

app.get("/matches/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await getMatchUseCase.execute(id);
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

const joinSchema = z.object({
  playerName: z.string().min(1),
});

app.post("/matches/:id/join", async (req, res) => {
  const { id } = req.params;
  const parsed = joinSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error });
    return;
  }

  try {
    const result = await joinMatchUseCase.execute(id, parsed.data.playerName);
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

const templateSchema = z.object({
  alignment: z.enum(["villain", "hero", "neutral"]),
  abilities: z.array(z.object({
    id: z.enum(["kill", "protect"]),
    canUseWhenDead: z.boolean().optional(),
  })),
});

app.post("/templates", async (req, res) => {
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
    };
    const result = await createTemplateUseCase.execute(input);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, res);
  }
});

const startSchema = z.object({
  templateIds: z.array(z.string()),
});

app.post("/matches/:id/start", async (req, res) => {
  const { id } = req.params;
  const parsed = startSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error });
    return;
  }

  try {
    const result = await startMatchUseCase.execute(id, parsed.data.templateIds);
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

const submitActionSchema = z.object({
  actorId: z.string(),
  abilityId: z.enum(["kill", "protect"]),
  targetIds: z.array(z.string()),
});

app.post("/matches/:id/actions", async (req, res) => {
  const { id } = req.params;
  const parsed = submitActionSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error });
    return;
  }

  try {
    const result = await submitActionUseCase.execute(
      id,
      parsed.data.actorId,
      parsed.data.abilityId as AbilityId,
      parsed.data.targetIds
    );
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

app.post("/matches/:id/advance-phase", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await advancePhaseUseCase.execute(id);
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
