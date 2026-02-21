import express from "express";
import crypto from "node:crypto";
import { Match } from "./domain/match";
import { InMemoryMatchRepository } from "./infrastructure/persistence/InMemoryMatchRepository";
import {
  MatchRepository,
  MatchSession,
  MatchStatus,
} from "./infrastructure/persistence/MatchRepository";
import { CreateMatchUseCase } from "./application/match/create_match";

const app = express();
app.use(express.json());

const repository: MatchRepository = new InMemoryMatchRepository();

app.post("/matches", async (_, res) => {
  const createMatchUseCase = new CreateMatchUseCase(repository);
  const session = await createMatchUseCase.execute();

  res.status(201).json({
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
