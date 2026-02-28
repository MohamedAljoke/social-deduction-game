import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApp } from "../../app";
import { MatchResponse, MatchStatus } from "../../domain/entity/match";
import { Alignment } from "../../domain/entity/template";
import { EffectType } from "../../domain/entity/ability";
import {
  InsufficientPlayers,
  MatchAlreadyStarted,
  MatchNotFound,
  MatchNotStarted,
  InvalidPhase,
  PlayerNotInMatch,
  PlayerIsDeadError,
  AbilityDoesNotBelongToUser,
  InvalidTargetCount,
  CannotTargetSelf,
  TargetNotAlive,
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

    it("should create a match with custom name", async () => {
      const { body, response } = await createMatchHelper("my_match");

      expect(response.status).toBe(201);
      expect(body.name).toBe("my_match");
    });
    it("should reject invalid body type", async () => {
      const response = await fetch(`http://localhost:${port}/match`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: 123 }),
      });

      expect(response.status).toBe(400);
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

    it("should reject missing name", async () => {
      const { body: match } = await createMatchHelper();

      const response = await fetch(
        `http://localhost:${port}/match/${match.id}/join`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject empty name", async () => {
      const { body: match } = await createMatchHelper();

      const response = await fetch(
        `http://localhost:${port}/match/${match.id}/join`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "" }),
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject non-string name", async () => {
      const { body: match } = await createMatchHelper();

      const response = await fetch(
        `http://localhost:${port}/match/${match.id}/join`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: 123 }),
        },
      );

      expect(response.status).toBe(400);
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

    it("should reject missing templates", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      const response = await fetch(
        `http://localhost:${port}/match/${match.id}/start`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject empty templates", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      const response = await fetch(
        `http://localhost:${port}/match/${match.id}/start`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ templates: [] }),
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject invalid alignment", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      const response = await fetch(
        `http://localhost:${port}/match/${match.id}/start`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templates: [
              { alignment: "invalid", abilities: [{ id: EffectType.Kill }] },
              {
                alignment: Alignment.Hero,
                abilities: [{ id: EffectType.Protect }],
              },
            ],
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject invalid ability id", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      const response = await fetch(
        `http://localhost:${port}/match/${match.id}/start`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templates: [
              {
                alignment: Alignment.Villain,
                abilities: [{ id: "invalid" }],
              },
              {
                alignment: Alignment.Hero,
                abilities: [{ id: EffectType.Protect }],
              },
            ],
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject template with empty abilities", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      const response = await fetch(
        `http://localhost:${port}/match/${match.id}/start`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templates: [
              { alignment: Alignment.Villain, abilities: [] },
              {
                alignment: Alignment.Hero,
                abilities: [{ id: EffectType.Protect }],
              },
            ],
          }),
        },
      );

      expect(response.status).toBe(400);
    });
  });

  describe("UseAbility UseCase", () => {
    it("should use ability in action phase", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);
      await advanceToActionPhase(match.id);

      const matchInAction = await getMatch(match.id);
      const alice = matchInAction.players.find((p) => p.name === "alice");
      const bob = matchInAction.players.find((p) => p.name === "bob");
      const aliceTemplate = matchInAction.templates.find(
        (t) => t.id === alice!.templateId,
      );
      const abilityToUse = aliceTemplate!.abilities[0].id;

      const { response, body } = await useAbilityHelper(
        match.id,
        alice!.id,
        abilityToUse,
        [bob!.id],
      );

      expect(response.status).toBe(200);
      expect(body.actions).toHaveLength(1);
      expect(body.actions[0]).toMatchObject({
        actorId: alice!.id,
        EffectType: abilityToUse,
        targetIds: [bob!.id],
      });
    });

    it("should reject ability when match not started", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      const { body: started } = await startMatchHelper(match.id);
      const alice = started.players.find((p) => p.name === "alice");
      const bob = started.players.find((p) => p.name === "bob");

      const { response, body } = await useAbilityHelper(
        match.id,
        alice!.id,
        EffectType.Kill,
        [bob!.id],
      );

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new InvalidPhase().code,
        message: new InvalidPhase().message,
      });
    });

    it("should reject ability in non-action phase", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      const { body: started } = await startMatchHelper(match.id);
      const alice = started.players.find((p) => p.name === "alice");
      const bob = started.players.find((p) => p.name === "bob");

      const { response, body } = await useAbilityHelper(
        match.id,
        alice!.id,
        EffectType.Kill,
        [bob!.id],
      );

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new InvalidPhase().code,
        message: new InvalidPhase().message,
      });
    });

    it("should reject ability when match not found", async () => {
      const { response, body } = await useAbilityHelper(
        "nonexistent",
        "actor",
        EffectType.Kill,
        ["target"],
      );

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new MatchNotFound().code,
        message: new MatchNotFound().message,
      });
    });

    it("should reject invalid ability id", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);
      await advanceToActionPhase(match.id);

      const alice = (await getMatch(match.id)).players.find(
        (p) => p.name === "alice",
      );
      const bob = (await getMatch(match.id)).players.find(
        (p) => p.name === "bob",
      );

      const response = await fetch(
        `http://localhost:${port}/match/${match.id}/ability`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            actorId: alice!.id,
            EffectType: "invalid",
            targetIds: [bob!.id],
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject ability not owned by player", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);
      await advanceToActionPhase(match.id);

      const matchInAction = await getMatch(match.id);
      const alice = matchInAction.players.find((p) => p.name === "alice");
      const bob = matchInAction.players.find((p) => p.name === "bob");
      const bobTemplate = matchInAction.templates.find(
        (t) => t.id === bob!.templateId,
      );
      const abilityBobHas = bobTemplate!.abilities[0].id;

      const { response, body } = await useAbilityHelper(
        match.id,
        alice!.id,
        abilityBobHas,
        [bob!.id],
      );

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new AbilityDoesNotBelongToUser().code,
        message: new AbilityDoesNotBelongToUser().message,
      });
    });

    it("should reject wrong target count", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);
      await advanceToActionPhase(match.id);

      const matchInAction = await getMatch(match.id);
      const alice = matchInAction.players.find((p) => p.name === "alice");
      const bob = matchInAction.players.find((p) => p.name === "bob");
      const aliceTemplate = matchInAction.templates.find(
        (t) => t.id === alice!.templateId,
      );
      const abilityAliceHas = aliceTemplate!.abilities[0].id;

      const { response, body } = await useAbilityHelper(
        match.id,
        alice!.id,
        abilityAliceHas,
        [],
      );

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new InvalidTargetCount(1, 0).code,
        message: new InvalidTargetCount(1, 0).message,
      });
    });

    it("should reject self-targeting when not allowed", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);
      await advanceToActionPhase(match.id);

      const matchInAction = await getMatch(match.id);
      const alice = matchInAction.players.find((p) => p.name === "alice");
      const aliceTemplate = matchInAction.templates.find(
        (t) => t.id === alice!.templateId,
      );
      const abilityAliceHas = aliceTemplate!.abilities[0].id;

      const { response, body } = await useAbilityHelper(
        match.id,
        alice!.id,
        abilityAliceHas,
        [alice!.id],
      );

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new CannotTargetSelf().code,
        message: new CannotTargetSelf().message,
      });
    });

    it("should reject self-targeting when not allowed", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);
      await advanceToActionPhase(match.id);

      const matchInAction = await getMatch(match.id);
      const alice = matchInAction.players.find((p) => p.name === "alice");
      const aliceTemplate = matchInAction.templates.find(
        (t) => t.id === alice!.templateId,
      );
      const abilityAliceHas = aliceTemplate!.abilities[0].id;

      const { response, body } = await useAbilityHelper(
        match.id,
        alice!.id,
        abilityAliceHas,
        [alice!.id],
      );

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new CannotTargetSelf().code,
        message: new CannotTargetSelf().message,
      });
    });
  });
});

async function createMatchHelper(name?: string): Promise<{
  body: MatchResponse;
  response: Response;
}> {
  const response = await fetch(`http://localhost:${port}/match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: name ? JSON.stringify({ name }) : undefined,
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
            abilities: [{ id: EffectType.Kill }],
          },
          {
            alignment: Alignment.Hero,
            abilities: [{ id: EffectType.Protect }],
          },
        ],
      }),
    },
  );

  const body = (await response.json()) as MatchResponse;

  return { body, response };
}

async function useAbilityHelper(
  matchId: string,
  actorId: string,
  EffectType: string,
  targetIds: string[],
): Promise<{
  body: MatchResponse;
  response: Response;
}> {
  const response = await fetch(
    `http://localhost:${port}/match/${matchId}/ability`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        actorId,
        EffectType,
        targetIds,
      }),
    },
  );

  const body = (await response.json()) as MatchResponse;

  return { body, response };
}

async function advanceToActionPhase(matchId: string): Promise<void> {
  let currentPhase = "discussion";
  while (currentPhase !== "action") {
    const response = await fetch(
      `http://localhost:${port}/match/${matchId}/phase`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
      },
    );
    if (!response.ok) {
      const body = await response.json();
      throw new Error(`Failed to advance phase: ${JSON.stringify(body)}`);
    }
    const match = (await response.json()) as MatchResponse;
    currentPhase = match.phase;
  }
}

async function getMatch(matchId: string): Promise<MatchResponse> {
  const response = await fetch(`http://localhost:${port}/match/${matchId}`, {
    method: "GET",
  });
  return (await response.json()) as MatchResponse;
}
