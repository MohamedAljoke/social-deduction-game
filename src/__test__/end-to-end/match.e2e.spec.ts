import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApp } from "../../app";
import { MatchResponse, MatchStatus } from "../../domain/entity/match";
import { Alignment } from "../../domain/entity/template";
import { AbilityId } from "../../domain/entity/ability";
import {
  InsufficientPlayers,
  MatchAlreadyStarted,
  MatchNotFound,
} from "../../domain/errors";

const port = 4001;

describe("Match E2E", () => {
  let server: ReturnType<typeof createApp>;

  beforeEach(async () => {
    server = createApp();
    await server.listen(port);
  });

  afterEach(async () => {
    await server.close();
  });

  describe("CreateMatch UseCase", () => {
    it("should create a match", async () => {
      const { body, response } = await createMatchHelper();

      expect(response.status).toBe(201);
      expect(body).toHaveProperty("id");
      expect(body.status).toBe(MatchStatus.LOBBY);
    });
  });

  describe("ListMatches UseCase", () => {
    it("should fetch all created matches", async () => {
      await createMatchHelper();

      const { body, response } = await listMatchesHelper();

      expect(response.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        name: "match_one",
        status: "lobby",
      });
      expect(body[0]).toHaveProperty("id");
      expect(body[0]).toHaveProperty("createdAt");
    });
  });

  describe("JoinMatch UseCase", () => {
    it("should allow a player to join a match", async () => {
      const { body: match } = await createMatchHelper();

      const { body, response } = await joinMatchHelper(match.id, "alice");

      expect(response.status).toBe(200);
      expect(body.players).toHaveLength(1);
      expect(body.players[0]).toMatchObject({
        name: "alice",
        status: "alive",
      });
    });

    it("should not allow a player to join a started match", async () => {
      const { body: match } = await createMatchHelper();

      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await startMatchHelper(match.id);

      const { body, response } = await joinMatchHelper(match.id, "charlie");

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new MatchAlreadyStarted().code,
        message: new MatchAlreadyStarted().message,
      });
    });

    it("should return error when match does not exist", async () => {
      const { body, response } = await joinMatchHelper("some_id", "alice");

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new MatchNotFound().code,
        message: new MatchNotFound().message,
      });
    });
  });

  describe("StartMatch UseCase", () => {
    it("should start a match correctly", async () => {
      const { body: match } = await createMatchHelper();

      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      const { response, body } = await startMatchHelper(match.id);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        id: match.id,
        status: "started",
        phase: "discussion",
      });

      console.log(body.players);
      expect(body.players).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "alice",
            status: "alive",
            templateId: expect.any(String),
          }),
          expect.objectContaining({
            name: "bob",
            status: "alive",
            templateId: expect.any(String),
          }),
        ]),
      );
    });

    it("should not start a match with less than 2 players", async () => {
      const { body: match } = await createMatchHelper();

      const { response, body } = await startMatchHelper(match.id);

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new InsufficientPlayers().code,
        message: new InsufficientPlayers().message,
      });
    });
  });
});

async function createMatchHelper(): Promise<{
  body: MatchResponse;
  response: Response;
}> {
  const response = await fetch(`http://localhost:${port}/match`, {
    method: "POST",
  });

  const body = (await response.json()) as MatchResponse;
  return { body: body, response };
}

async function listMatchesHelper(): Promise<{
  body: MatchResponse[];
  response: Response;
}> {
  const response = await fetch(`http://localhost:${port}/match`, {
    method: "GET",
  });

  const body = (await response.json()) as MatchResponse[];

  return { body, response };
}

async function joinMatchHelper(
  matchId: string,
  name: string,
): Promise<{
  body: MatchResponse;
  response: Response;
}> {
  const response = await fetch(
    `http://localhost:${port}/match/${matchId}/join`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name }),
    },
  );

  const body = (await response.json()) as MatchResponse;

  return { body, response };
}

async function startMatchHelper(matchId: string): Promise<{
  body: MatchResponse;
  response: Response;
}> {
  const response = await fetch(
    `http://localhost:${port}/match/${matchId}/start`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        templates: [
          {
            alignment: Alignment.Villain,
            abilities: [{ id: AbilityId.Kill }],
          },
          {
            alignment: Alignment.Hero,
            abilities: [{ id: AbilityId.Protect }],
          },
        ],
      }),
    },
  );

  const body = (await response.json()) as MatchResponse;

  return { body, response };
}
