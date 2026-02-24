import express from "express";
import { InMemoryMatchRepository } from "../infrastructure/persistence/InMemoryMatchRepository";
import { InMemoryTemplateRepository } from "../infrastructure/persistence/InMemoryTemplateRepository";
import { CreateMatchUseCase } from "../application/CreateMatch";
import { JoinMatchUseCase } from "../application/JoinMatchUseCase";
import { GetMatchUseCase } from "../application/GetMatchUseCase";
import { GetPlayerRoleUseCase } from "../application/GetPlayerRoleUseCase";
import { StartMatchUseCase } from "../application/StartMatchUseCase";
import { SubmitActionUseCase } from "../application/SubmitActionUseCase";
import { SubmitVoteUseCase } from "../application/SubmitVoteUseCase";
import { AdvancePhaseUseCase } from "../application/AdvancePhaseUseCase";
import { CreateTemplateUseCase } from "../application/CreateTemplateUseCase";
import { ListTemplatesUseCase } from "../application/ListTemplatesUseCase";
import { GetTemplateUseCase } from "../application/GetTemplateUseCase";
import { createMatchRouter } from "./routes/matches";
import { createTemplateRouter } from "./routes/templates";

export function createApp(): express.Express {
  const matchRepository = new InMemoryMatchRepository();
  const templateRepository = new InMemoryTemplateRepository();

  const matchUseCases = {
    createMatch: new CreateMatchUseCase(matchRepository),
    joinMatch: new JoinMatchUseCase(matchRepository),
    getMatch: new GetMatchUseCase(matchRepository),
    getPlayerRole: new GetPlayerRoleUseCase(matchRepository),
    startMatch: new StartMatchUseCase(matchRepository, templateRepository),
    submitAction: new SubmitActionUseCase(matchRepository),
    submitVote: new SubmitVoteUseCase(matchRepository),
    advancePhase: new AdvancePhaseUseCase(matchRepository),
  };

  const templateUseCases = {
    createTemplate: new CreateTemplateUseCase(templateRepository),
    listTemplates: new ListTemplatesUseCase(templateRepository),
    getTemplate: new GetTemplateUseCase(templateRepository),
  };

  const app = express();
  app.use(express.json());
  app.use("/matches", createMatchRouter(matchUseCases));
  app.use("/templates", createTemplateRouter(templateUseCases));

  return app;
}
