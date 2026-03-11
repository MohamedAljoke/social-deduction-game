import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApp } from "../../app";
import { MatchResponse, MatchStatus } from "../../domain/entity/match";
import { Alignment } from "../../domain/entity/template";
import { EffectType } from "../../domain/entity/ability";
import {
  InsufficientPlayers,
  MatchAlreadyStarted,
  MatchNotFound,
  InvalidPhase,
  AbilityDoesNotBelongToUser,
  InvalidTargetCount,
  CannotTargetSelf,
  PlayerIsDeadError,
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
    it("should expose a health endpoint for readiness checks", async () => {
      const response = await fetch(`http://localhost:${port}/health`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ status: "ok" });
    });

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

  describe("LeaveMatch UseCase", () => {
    it("should reject missing playerId", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");

      const response = await fetch(
        `http://localhost:${port}/match/${match.id}/leave`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
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

    it("should allow missing templates and fallback to defaults", async () => {
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

      const body = (await response.json()) as MatchResponse;

      expect(response.status).toBe(200);
      expect(body.status).toBe(MatchStatus.STARTED);
      expect(body.players).toHaveLength(2);
      expect(body.templates).toHaveLength(2);
      expect(
        body.templates.every((template) => template.name === "Citizen"),
      ).toBe(true);
    });

    it("should allow empty templates and fallback to defaults", async () => {
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

      const body = (await response.json()) as MatchResponse;

      expect(response.status).toBe(200);
      expect(body.status).toBe(MatchStatus.STARTED);
      expect(body.players).toHaveLength(2);
      expect(body.templates).toHaveLength(2);
      expect(
        body.templates.every((template) => template.name === "Citizen"),
      ).toBe(true);
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

    it("should allow template with empty abilities", async () => {
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

      const body = (await response.json()) as MatchResponse;

      expect(response.status).toBe(200);
      expect(body.status).toBe(MatchStatus.STARTED);
      expect(body.templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alignment: Alignment.Villain,
            abilities: [],
          }),
        ]),
      );
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

  describe("Ability Resolution", () => {
    it("kill: villain kills hero → hero status is dead after resolution", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchWithTemplatesHelper(match.id, [
        { alignment: Alignment.Villain, abilities: [{ id: EffectType.Kill }] },
        { alignment: Alignment.Hero, abilities: [{ id: EffectType.Protect }] },
      ]);

      const started = await getMatch(match.id);
      const villain = findPlayerByAlignment(started, Alignment.Villain);
      const hero = findPlayerByAlignment(started, Alignment.Hero);
      expect(villain).toBeDefined();
      expect(hero).toBeDefined();

      // Advance to action phase
      await advancePhaseHelper(match.id); // discussion -> voting
      await advancePhaseHelper(match.id); // voting -> action

      // Villain kills hero
      await useAbilityHelper(match.id, villain!.id, EffectType.Kill, [
        hero!.id,
      ]);

      // Advance to resolution
      const { body: resolved } = await advancePhaseHelper(match.id);

      const deadHero = resolved.players.find((p) => p.id === hero!.id);
      expect(deadHero?.status).toBe("dead");
    });

    it("protect: hero protects target, villain kills same target → target survives", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");

      await startMatchWithTemplatesHelper(match.id, [
        { alignment: Alignment.Villain, abilities: [{ id: EffectType.Kill }] },
        { alignment: Alignment.Hero, abilities: [{ id: EffectType.Protect }] },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
      ]);

      const started = await getMatch(match.id);
      const villain = findPlayerByAlignment(started, Alignment.Villain);
      const protector = started.players.find(
        (p) =>
          findTemplateAlignment(started, p.id) === Alignment.Hero &&
          started.templates.find((t) => t.id === p.templateId)?.abilities[0]
            ?.id === EffectType.Protect,
      );
      const target = started.players.find(
        (p) => p.id !== villain?.id && p.id !== protector?.id,
      );
      expect(villain).toBeDefined();
      expect(protector).toBeDefined();
      expect(target).toBeDefined();

      await advancePhaseHelper(match.id); // discussion -> voting
      await advancePhaseHelper(match.id); // voting -> action

      // Protector protects target; villain kills same target
      await useAbilityHelper(match.id, protector!.id, EffectType.Protect, [
        target!.id,
      ]);
      await useAbilityHelper(match.id, villain!.id, EffectType.Kill, [
        target!.id,
      ]);

      const { body: resolved } = await advancePhaseHelper(match.id); // action -> resolution

      const survivedPlayer = resolved.players.find((p) => p.id === target!.id);
      expect(survivedPlayer?.status).toBe("alive");
    });

    it("roleblock: villain is roleblocked → kill is cancelled, target survives", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");

      await startMatchWithTemplatesHelper(match.id, [
        { alignment: Alignment.Villain, abilities: [{ id: EffectType.Kill }] },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Roleblock }],
        },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
      ]);

      const started = await getMatch(match.id);
      const villain = findPlayerByAlignment(started, Alignment.Villain);
      const blocker = started.players.find(
        (p) =>
          findTemplateAlignment(started, p.id) === Alignment.Hero &&
          started.templates.find((t) => t.id === p.templateId)?.abilities[0]
            ?.id === EffectType.Roleblock,
      );
      const killTarget = started.players.find(
        (p) => p.id !== villain?.id && p.id !== blocker?.id,
      );
      expect(villain).toBeDefined();
      expect(blocker).toBeDefined();
      expect(killTarget).toBeDefined();

      await advancePhaseHelper(match.id); // discussion -> voting
      await advancePhaseHelper(match.id); // voting -> action

      // Blocker roleblocks the villain; villain tries to kill
      await useAbilityHelper(match.id, blocker!.id, EffectType.Roleblock, [
        villain!.id,
      ]);
      await useAbilityHelper(match.id, villain!.id, EffectType.Kill, [
        killTarget!.id,
      ]);

      const { body: resolved } = await advancePhaseHelper(match.id); // action -> resolution

      const target = resolved.players.find((p) => p.id === killTarget!.id);
      expect(target?.status).toBe("alive");
    });

    it("investigate: detective investigates villain → all alive, match still running", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");

      // 1 villain vs 2 heroes → villain cannot win by parity yet
      await startMatchWithTemplatesHelper(match.id, [
        { alignment: Alignment.Villain, abilities: [{ id: EffectType.Kill }] },
        { alignment: Alignment.Hero, abilities: [{ id: EffectType.Protect }] },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
      ]);

      const started = await getMatch(match.id);
      const detective = started.players.find(
        (p) =>
          started.templates.find((t) => t.id === p.templateId)?.abilities[0]
            ?.id === EffectType.Investigate,
      );
      const suspect = findPlayerByAlignment(started, Alignment.Villain);
      expect(detective).toBeDefined();
      expect(suspect).toBeDefined();

      await advancePhaseHelper(match.id); // discussion -> voting
      await advancePhaseHelper(match.id); // voting -> action

      // Detective investigates villain; no kill submitted → no one dies
      await useAbilityHelper(match.id, detective!.id, EffectType.Investigate, [
        suspect!.id,
      ]);

      const { body: resolved } = await advancePhaseHelper(match.id); // action -> resolution

      expect(resolved.players.every((p) => p.status === "alive")).toBe(true);
      expect(resolved.status).toBe(MatchStatus.STARTED);
    });
  });

  describe("SubmitVote UseCase", () => {
    it("should reject invalid vote body", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await startMatchHelper(match.id);
      await advancePhaseHelper(match.id); // discussion -> voting

      const response = await fetch(
        `http://localhost:${port}/match/${match.id}/vote`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ voterId: "", targetId: 123 }),
        },
      );

      expect(response.status).toBe(400);
    });

    it("should allow an alive player to vote for an alive target", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");

      await startMatchHelper(match.id);
      await advancePhaseHelper(match.id); // discussion -> voting

      const votingMatch = await getMatch(match.id);
      const voter = votingMatch.players[0];
      const target = votingMatch.players[1];

      const { response, body } = await submitVoteHelper(match.id, voter.id, target.id);

      expect(response.status).toBe(200);
      expect(body.votes).toContainEqual({ voterId: voter.id, targetId: target.id });
    });

    it("should allow an alive player to skip vote", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");

      await startMatchHelper(match.id);
      await advancePhaseHelper(match.id); // discussion -> voting

      const votingMatch = await getMatch(match.id);
      const voter = votingMatch.players[0];

      const { response, body } = await submitVoteHelper(match.id, voter.id, null);

      expect(response.status).toBe(200);
      expect(body.votes).toContainEqual({ voterId: voter.id, targetId: null });
    });

    it("should reject a dead voter with the existing error shape", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");
      await joinMatchHelper(match.id, "diana");

      await startMatchWithTemplatesHelper(match.id, [
        { alignment: Alignment.Villain, abilities: [{ id: EffectType.Kill }] },
        { alignment: Alignment.Hero, abilities: [{ id: EffectType.Protect }] },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
      ]);

      const started = await getMatch(match.id);
      const villain = findPlayerByAlignment(started, Alignment.Villain);
      const heroTarget = started.players.find(
        (player) => player.id !== villain?.id && findTemplateAlignment(started, player.id) === Alignment.Hero,
      );

      await advancePhaseHelper(match.id); // discussion -> voting
      await advancePhaseHelper(match.id); // voting -> action
      await useAbilityHelper(match.id, villain!.id, EffectType.Kill, [heroTarget!.id]);
      await advancePhaseHelper(match.id); // action -> resolution
      await advancePhaseHelper(match.id); // resolution -> discussion
      await advancePhaseHelper(match.id); // discussion -> voting

      const votingMatch = await getMatch(match.id);
      const aliveTarget = votingMatch.players.find((player) => player.status === "alive" && player.id !== heroTarget!.id);

      const { response, body } = await submitVoteHelper(match.id, heroTarget!.id, aliveTarget!.id);

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new PlayerIsDeadError().code,
        message: new PlayerIsDeadError().message,
      });
    });

    it("should reject an eliminated voter with the existing error shape", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");
      await joinMatchHelper(match.id, "diana");

      await startMatchWithTemplatesHelper(match.id, [
        { alignment: Alignment.Villain, abilities: [{ id: EffectType.Kill }] },
        { alignment: Alignment.Hero, abilities: [{ id: EffectType.Protect }] },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
      ]);

      const started = await getMatch(match.id);
      const eliminatedTarget = started.players.find(
        (player) => findTemplateAlignment(started, player.id) === Alignment.Hero,
      );
      const voters = started.players.filter((player) => player.id !== eliminatedTarget?.id);

      await advancePhaseHelper(match.id); // discussion -> voting
      for (const voter of voters) {
        await submitVoteHelper(match.id, voter.id, eliminatedTarget!.id);
      }
      await advancePhaseHelper(match.id); // voting -> action, eliminate target
      await advancePhaseHelper(match.id); // action -> resolution
      await advancePhaseHelper(match.id); // resolution -> discussion
      await advancePhaseHelper(match.id); // discussion -> voting

      const votingMatch = await getMatch(match.id);
      const aliveTarget = votingMatch.players.find(
        (player) => player.status === "alive" && player.id !== eliminatedTarget!.id,
      );

      const { response, body } = await submitVoteHelper(
        match.id,
        eliminatedTarget!.id,
        aliveTarget!.id,
      );

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new PlayerIsDeadError().code,
        message: new PlayerIsDeadError().message,
      });
    });

    it("should reject votes targeting a dead player", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");
      await joinMatchHelper(match.id, "diana");

      await startMatchWithTemplatesHelper(match.id, [
        { alignment: Alignment.Villain, abilities: [{ id: EffectType.Kill }] },
        { alignment: Alignment.Hero, abilities: [{ id: EffectType.Protect }] },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
      ]);

      const started = await getMatch(match.id);
      const villain = findPlayerByAlignment(started, Alignment.Villain);
      const deadTarget = started.players.find(
        (player) => player.id !== villain?.id && findTemplateAlignment(started, player.id) === Alignment.Hero,
      );

      await advancePhaseHelper(match.id); // discussion -> voting
      await advancePhaseHelper(match.id); // voting -> action
      await useAbilityHelper(match.id, villain!.id, EffectType.Kill, [deadTarget!.id]);
      await advancePhaseHelper(match.id); // action -> resolution
      await advancePhaseHelper(match.id); // resolution -> discussion
      await advancePhaseHelper(match.id); // discussion -> voting

      const votingMatch = await getMatch(match.id);
      const aliveVoter = votingMatch.players.find(
        (player) => player.status === "alive" && player.id !== deadTarget!.id,
      );

      const { response, body } = await submitVoteHelper(match.id, aliveVoter!.id, deadTarget!.id);

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new TargetNotAlive().code,
        message: new TargetNotAlive().message,
      });
    });

    it("should reject votes targeting an eliminated player", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");
      await joinMatchHelper(match.id, "diana");

      await startMatchWithTemplatesHelper(match.id, [
        { alignment: Alignment.Villain, abilities: [{ id: EffectType.Kill }] },
        { alignment: Alignment.Hero, abilities: [{ id: EffectType.Protect }] },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
      ]);

      const started = await getMatch(match.id);
      const eliminatedTarget = started.players.find(
        (player) => findTemplateAlignment(started, player.id) === Alignment.Hero,
      );
      const voters = started.players.filter((player) => player.id !== eliminatedTarget?.id);

      await advancePhaseHelper(match.id); // discussion -> voting
      for (const voter of voters) {
        await submitVoteHelper(match.id, voter.id, eliminatedTarget!.id);
      }
      await advancePhaseHelper(match.id); // voting -> action, eliminate target
      await advancePhaseHelper(match.id); // action -> resolution
      await advancePhaseHelper(match.id); // resolution -> discussion
      await advancePhaseHelper(match.id); // discussion -> voting

      const votingMatch = await getMatch(match.id);
      const aliveVoter = votingMatch.players.find(
        (player) => player.status === "alive" && player.id !== voters[0].id,
      ) ?? voters[0];

      const { response, body } = await submitVoteHelper(
        match.id,
        aliveVoter.id,
        eliminatedTarget!.id,
      );

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new TargetNotAlive().code,
        message: new TargetNotAlive().message,
      });
    });
  });

  describe("Win Condition", () => {
    it("should finish the match with hero winner when last villain is eliminated", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await startMatchHelper(match.id);

      const started = await getMatch(match.id);
      const villain = findPlayerByAlignment(started, Alignment.Villain);
      const hero = findPlayerByAlignment(started, Alignment.Hero);

      expect(villain).toBeDefined();
      expect(hero).toBeDefined();

      await advancePhaseHelper(match.id); // discussion -> voting
      await submitVoteHelper(match.id, hero!.id, villain!.id);
      const { body: finishedMatch } = await advancePhaseHelper(match.id); // voting -> action

      expect(finishedMatch.status).toBe(MatchStatus.FINISHED);
      expect(finishedMatch.winnerAlignment).toBe(Alignment.Hero);
      expect(
        finishedMatch.players.find((player) => player.id === villain!.id)
          ?.status,
      ).toBe("eliminated");
    });

    it("should finish the match with villain winner when villains reach parity", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");

      await startMatchWithTemplatesHelper(match.id, [
        { alignment: Alignment.Villain, abilities: [{ id: EffectType.Kill }] },
        { alignment: Alignment.Hero, abilities: [{ id: EffectType.Protect }] },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
      ]);

      const started = await getMatch(match.id);
      const villain = findPlayerByAlignment(started, Alignment.Villain);
      const heroTarget = started.players.find(
        (player) =>
          player.id !== villain?.id &&
          findTemplateAlignment(started, player.id) === Alignment.Hero,
      );

      expect(villain).toBeDefined();
      expect(heroTarget).toBeDefined();

      await advancePhaseHelper(match.id); // discussion -> voting
      await submitVoteHelper(match.id, villain!.id, heroTarget!.id);
      const { body: finishedMatch } = await advancePhaseHelper(match.id); // voting -> action

      expect(finishedMatch.status).toBe(MatchStatus.FINISHED);
      expect(finishedMatch.winnerAlignment).toBe(Alignment.Villain);
    });

    it("should keep the match running when voting ends in a tie", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");

      await startMatchWithTemplatesHelper(match.id, [
        { alignment: Alignment.Villain, abilities: [{ id: EffectType.Kill }] },
        { alignment: Alignment.Hero, abilities: [{ id: EffectType.Protect }] },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
      ]);

      const started = await getMatch(match.id);
      const villain = findPlayerByAlignment(started, Alignment.Villain);
      const heroes = started.players.filter(
        (player) =>
          findTemplateAlignment(started, player.id) === Alignment.Hero,
      );

      expect(villain).toBeDefined();
      expect(heroes).toHaveLength(2);

      await advancePhaseHelper(match.id); // discussion -> voting
      await submitVoteHelper(match.id, villain!.id, heroes[0].id);
      await submitVoteHelper(match.id, heroes[0].id, villain!.id);
      const { body: updated } = await advancePhaseHelper(match.id); // voting -> action

      expect(updated.status).toBe(MatchStatus.STARTED);
      expect(updated.winnerAlignment).toBeNull();
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
  return startMatchWithTemplatesHelper(matchId, [
    {
      alignment: Alignment.Villain,
      abilities: [{ id: EffectType.Kill }],
    },
    {
      alignment: Alignment.Hero,
      abilities: [{ id: EffectType.Protect }],
    },
  ]);
}

async function startMatchWithTemplatesHelper(
  matchId: string,
  templates: {
    alignment: Alignment;
    abilities: { id: EffectType }[];
  }[],
): Promise<{
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
        templates,
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

async function submitVoteHelper(
  matchId: string,
  voterId: string,
  targetId: string | null,
): Promise<{
  body: MatchResponse;
  response: Response;
}> {
  const response = await fetch(
    `http://localhost:${port}/match/${matchId}/vote`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ voterId, targetId }),
    },
  );

  const body = (await response.json()) as MatchResponse;

  return { body, response };
}

async function advancePhaseHelper(matchId: string): Promise<{
  body: MatchResponse;
  response: Response;
}> {
  const response = await fetch(
    `http://localhost:${port}/match/${matchId}/phase`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
    },
  );
  const body = (await response.json()) as MatchResponse;

  return { body, response };
}

async function advanceToActionPhase(matchId: string): Promise<void> {
  let currentPhase = "discussion";
  while (currentPhase !== "action") {
    const { response, body } = await advancePhaseHelper(matchId);
    if (!response.ok) {
      throw new Error(`Failed to advance phase: ${JSON.stringify(body)}`);
    }
    currentPhase = body.phase;
  }
}

async function getMatch(matchId: string): Promise<MatchResponse> {
  const response = await fetch(`http://localhost:${port}/match/${matchId}`, {
    method: "GET",
  });
  return (await response.json()) as MatchResponse;
}

function findTemplateAlignment(
  match: MatchResponse,
  playerId: string,
): Alignment | null {
  const player = match.players.find((p) => p.id === playerId);
  if (!player?.templateId) {
    return null;
  }
  const template = match.templates.find((t) => t.id === player.templateId);
  return template?.alignment ?? null;
}

function findPlayerByAlignment(match: MatchResponse, alignment: Alignment) {
  return match.players.find(
    (player) => findTemplateAlignment(match, player.id) === alignment,
  );
}
