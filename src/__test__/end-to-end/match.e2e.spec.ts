import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApp } from "../../app";
import { MatchResponse, MatchStatus } from "../../domain/entity/match";

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

  it("should create a match", async () => {
    const { body, response } = await createMatchHelper();

    expect(response.status).toBe(201);
    expect(body).toHaveProperty("id");
    expect(body.status).toBe(MatchStatus.LOBBY);
  });

  it("should fetch all created matches", async () => {
    await createMatchHelper();

    const { body, response } = await listMatchesHelper();

    expect(response.status).toBe(200);
    expect(body).length(1);
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("name", "match_one");
    expect(body[0]).toHaveProperty("status", "lobby");
    expect(body[0]).toHaveProperty("createdAt");
  });

  it("should allow a player to join a match", async () => {
    const { body: match } = await createMatchHelper();

    const { body, response } = await joinMatchHelper(match.id, "alice");

    expect(response.status).toBe(200);
    expect(body.id).toBe(match.id);
    expect(body.players).toBeDefined();
    expect(body.players.length).toBe(1);
    expect(body.players[0]).toMatchObject({
      name: "alice",
      status: "alive",
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
