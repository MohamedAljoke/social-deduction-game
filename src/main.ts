import express from "express";
import { CreateMatchUseCase } from "./application/match/create_match";
import { JoinMatchUseCase } from "./application/JoinMatchUseCase";
import { InMemoryMatchRepository } from "./infrastructure/persistence/InMemoryMatchRepository";
import { MatchRepository } from "./infrastructure/persistence/MatchRepository";
import { DomainError } from "./domain/errors";

const app = express();
app.use(express.json());

const repository: MatchRepository = new InMemoryMatchRepository();
const createMatchUseCase = new CreateMatchUseCase(repository);
const joinMatchUseCase = new JoinMatchUseCase(repository);

app.post("/matches", async (req, res) => {
  const result = await createMatchUseCase.execute();

  res.status(201).json(result);
});

app.post("/matches/:id/join", async (req, res) => {
  const { id } = req.params;
  const { playerName } = req.body;

  try {
    const result = await joinMatchUseCase.execute(id, playerName);
    res.json(result);
  } catch (err) {
    if (err instanceof DomainError) {
      const status = err.code === "match_not_found" ? 404 : 400;
      res.status(status).json({ error: err.message, code: err.code });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
