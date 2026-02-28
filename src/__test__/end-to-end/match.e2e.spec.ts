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
  VoteNotAllowed,
  AlreadyVoted,
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
        effectType: abilityToUse,
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
            effectType: "invalid",
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

  describe("Resolution pipeline", () => {
    it("should kill an unprotected target in resolution", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchWithTemplates(match.id, [
        {
          alignment: Alignment.Villain,
          abilities: [{ id: EffectType.Kill }],
        },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
      ]);
      await advanceToActionPhase(match.id);

      const matchInAction = await getMatch(match.id);
      const killer = findPlayerByAbility(matchInAction, EffectType.Kill);
      const victim = matchInAction.players.find((p) => p.id !== killer.id);
      expect(victim).toBeDefined();

      await useAbilityHelper(match.id, killer.id, EffectType.Kill, [victim!.id]);

      const resolution = await advanceToResolutionPhase(match.id);

      expect(resolution.phase).toBe("resolution");
      expect(resolution.actions).toHaveLength(0);
      expect(resolution.resolution?.effects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "kill",
            actorId: killer.id,
            targetIds: [victim!.id],
          }),
        ]),
      );

      const afterResolution = await getMatch(match.id);
      const victimAfterResolution = afterResolution.players.find(
        (p) => p.id === victim!.id,
      );
      expect(victimAfterResolution?.status).toBe("dead");
    });

    it("should block kill when target is protected", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchWithTemplates(match.id, [
        {
          alignment: Alignment.Villain,
          abilities: [{ id: EffectType.Kill }],
        },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Protect, canTargetSelf: true }],
        },
      ]);
      await advanceToActionPhase(match.id);

      const matchInAction = await getMatch(match.id);
      const killer = findPlayerByAbility(matchInAction, EffectType.Kill);
      const protector = findPlayerByAbility(matchInAction, EffectType.Protect);

      await useAbilityHelper(match.id, killer.id, EffectType.Kill, [protector.id]);
      await useAbilityHelper(match.id, protector.id, EffectType.Protect, [
        protector.id,
      ]);

      const resolution = await advanceToResolutionPhase(match.id);
      const effects = resolution.resolution?.effects ?? [];

      expect(effects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "protect",
            actorId: protector.id,
            targetIds: [protector.id],
          }),
          expect.objectContaining({
            type: "kill_blocked",
            actorId: killer.id,
            targetIds: [protector.id],
          }),
        ]),
      );

      const afterResolution = await getMatch(match.id);
      const protectorAfterResolution = afterResolution.players.find(
        (p) => p.id === protector.id,
      );
      expect(protectorAfterResolution?.status).toBe("alive");
    });

    it("should cancel offensive action when actor is roleblocked", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");

      await startMatchWithTemplates(match.id, [
        {
          alignment: Alignment.Villain,
          abilities: [{ id: EffectType.Roleblock }],
        },
        {
          alignment: Alignment.Villain,
          abilities: [{ id: EffectType.Kill }],
        },
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
      ]);
      await advanceToActionPhase(match.id);

      const matchInAction = await getMatch(match.id);
      const roleblocker = findPlayerByAbility(matchInAction, EffectType.Roleblock);
      const killer = findPlayerByAbility(matchInAction, EffectType.Kill);
      const victim = matchInAction.players.find(
        (p) => p.id !== roleblocker.id && p.id !== killer.id,
      );
      expect(victim).toBeDefined();

      await useAbilityHelper(match.id, killer.id, EffectType.Kill, [victim!.id]);
      await useAbilityHelper(match.id, roleblocker.id, EffectType.Roleblock, [
        killer.id,
      ]);

      const resolution = await advanceToResolutionPhase(match.id);
      const effects = resolution.resolution?.effects ?? [];
      const effectTypes = effects.map((effect) => effect.type);

      expect(effects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "roleblock",
            actorId: roleblocker.id,
            targetIds: [killer.id],
          }),
        ]),
      );
      expect(effectTypes).not.toContain("kill");

      const afterResolution = await getMatch(match.id);
      const victimAfterResolution = afterResolution.players.find(
        (p) => p.id === victim!.id,
      );
      expect(victimAfterResolution?.status).toBe("alive");
    });

    it("should return target alignment for investigate effect", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchWithTemplates(match.id, [
        {
          alignment: Alignment.Hero,
          abilities: [{ id: EffectType.Investigate }],
        },
        {
          alignment: Alignment.Villain,
          abilities: [{ id: EffectType.Kill }],
        },
      ]);
      await advanceToActionPhase(match.id);

      const matchInAction = await getMatch(match.id);
      const investigator = findPlayerByAbility(
        matchInAction,
        EffectType.Investigate,
      );
      const target = matchInAction.players.find((p) => p.id !== investigator.id);
      expect(target).toBeDefined();
      const targetTemplate = matchInAction.templates.find(
        (template) => template.id === target!.templateId,
      );
      expect(targetTemplate).toBeDefined();

      await useAbilityHelper(match.id, investigator.id, EffectType.Investigate, [
        target!.id,
      ]);

      const resolution = await advanceToResolutionPhase(match.id);
      const investigateResult = resolution.resolution?.effects.find(
        (effect) =>
          effect.type === "investigate" &&
          effect.actorId === investigator.id &&
          effect.targetIds[0] === target!.id,
      );

      expect(investigateResult).toBeDefined();
      expect(investigateResult?.data).toMatchObject({
        alignment: targetTemplate!.alignment,
      });
    });
  });

  describe("Full Game Scenarios", () => {
    it("should complete multiple night cycles with abilities", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");
      await joinMatchHelper(match.id, "charlie");

      await startMatchWithTemplates(match.id, [
        { alignment: Alignment.Hero, abilities: [{ id: EffectType.Investigate }] },
        { alignment: Alignment.Villain, abilities: [{ id: EffectType.Kill }] },
        { alignment: Alignment.Hero, abilities: [{ id: EffectType.Protect, canTargetSelf: true }] },
      ]);

      // --- Night 1 ---
      await advanceToActionPhase(match.id);
      
      let m = await getMatch(match.id);
      const investigator = findPlayerByAbility(m, EffectType.Investigate);
      const killer = findPlayerByAbility(m, EffectType.Kill);
      const protector = findPlayerByAbility(m, EffectType.Protect);

      // Investigator looks for villains
      await useAbilityHelper(match.id, investigator.id, EffectType.Investigate, [killer.id]);
      // Protector protects self
      await useAbilityHelper(match.id, protector.id, EffectType.Protect, [protector.id]);

      let res = await advanceToResolutionPhase(match.id);
      expect(res.resolution?.effects).toContainEqual(
        expect.objectContaining({ type: "investigate" }),
      );
      expect(res.resolution?.effects).toContainEqual(
        expect.objectContaining({ type: "protect" }),
      );

      // --- Day 1 -> Night 2 ---
      await advanceToActionPhase(match.id);

      // Verify players are still in game
      m = await getMatch(match.id);
      expect(m.players).toHaveLength(3);
      expect(m.phase).toBe("action");

      // --- Night 2: Another action cycle ---
      // Use abilities again
      const killerAgain = findPlayerByAbility(m, EffectType.Kill);
      const investigatorAgain = findPlayerByAbility(m, EffectType.Investigate);

      // Killer attempts to kill investigator
      await useAbilityHelper(match.id, killerAgain.id, EffectType.Kill, [investigatorAgain.id]);

      res = await advanceToResolutionPhase(match.id);
      
      // Verify investigator died
      m = await getMatch(match.id);
      const deadPlayers = m.players.filter(p => p.status === "dead");
      expect(deadPlayers.length).toBeGreaterThan(0);
    });
  });

  describe("Voting Pipeline", () => {
    it("should cast vote during voting phase", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);
      await advanceToVotingPhase(match.id);

      const matchInVoting = await getMatch(match.id);
      const alice = matchInVoting.players.find((p) => p.name === "alice");
      const bob = matchInVoting.players.find((p) => p.name === "bob");

      const { response, body } = await castVoteHelper(
        match.id,
        alice!.id,
        bob!.id,
      );

      expect(response.status).toBe(200);
      expect(body.currentVotes).toHaveLength(1);
      expect(body.currentVotes[0]).toMatchObject({
        voterId: alice!.id,
        targetId: bob!.id,
      });
    });

    it("should reject vote outside voting phase", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);

      const matchInDiscussion = await getMatch(match.id);
      const alice = matchInDiscussion.players.find((p) => p.name === "alice");
      const bob = matchInDiscussion.players.find((p) => p.name === "bob");

      const { response, body } = await castVoteHelper(
        match.id,
        alice!.id,
        bob!.id,
      );

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new VoteNotAllowed().code,
        message: new VoteNotAllowed().message,
      });
    });

    it("should reject duplicate votes from same player", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);
      await advanceToVotingPhase(match.id);

      const matchInVoting = await getMatch(match.id);
      const alice = matchInVoting.players.find((p) => p.name === "alice");
      const bob = matchInVoting.players.find((p) => p.name === "bob");

      await castVoteHelper(match.id, alice!.id, bob!.id);

      const { response, body } = await castVoteHelper(
        match.id,
        alice!.id,
        bob!.id,
      );

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: new AlreadyVoted().code,
        message: new AlreadyVoted().message,
      });
    });

    it("should eliminate player with highest votes", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);
      await advanceToVotingPhase(match.id);

      const matchInVoting = await getMatch(match.id);
      const alice = matchInVoting.players.find((p) => p.name === "alice");
      const bob = matchInVoting.players.find((p) => p.name === "bob");

      // Only alice votes for bob — clear 1-0 win, bob is eliminated
      await castVoteHelper(match.id, alice!.id, bob!.id);

      const { body } = await advancePhaseHelper(match.id);

      expect(body.voteResolution!).toHaveLength(1);
      expect(body.voteResolution![0].resultType).toBe("eliminated");

      const afterMatch = await getMatch(match.id);
      const eliminated = afterMatch.players.find(
        (p) => p.id === body.voteResolution![0].candidateId,
      );
      expect(eliminated?.status).toBe("eliminated");
    });

    it("should handle tie - no elimination", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);
      await advanceToVotingPhase(match.id);

      const matchInVoting = await getMatch(match.id);
      const alice = matchInVoting.players.find((p) => p.name === "alice");
      const bob = matchInVoting.players.find((p) => p.name === "bob");

      await castVoteHelper(match.id, alice!.id, bob!.id);
      await castVoteHelper(match.id, bob!.id, alice!.id);

      const { body } = await advancePhaseHelper(match.id);

      expect(body.voteResolution!).toHaveLength(2);
      const types = body.voteResolution!.map((r) => r.resultType);
      expect(types).toContain("tie");

      const afterMatch = await getMatch(match.id);
      const allAlive = afterMatch.players.every((p) => p.status === "alive");
      expect(allAlive).toBe(true);
    });

    it("should advance to action phase after voting and tally votes", async () => {
      const { body: match } = await createMatchHelper();
      await joinMatchHelper(match.id, "alice");
      await joinMatchHelper(match.id, "bob");

      await startMatchHelper(match.id);
      await advanceToVotingPhase(match.id);

      const matchInVoting = await getMatch(match.id);
      const alice = matchInVoting.players.find((p) => p.name === "alice");
      const bob = matchInVoting.players.find((p) => p.name === "bob");

      await castVoteHelper(match.id, alice!.id, bob!.id);
      await castVoteHelper(match.id, bob!.id, alice!.id);

      const { body } = await advancePhaseHelper(match.id);

      expect(body.phase).toBe("action");
      expect(body.voteResolution).toBeDefined();
    });
  });
});

type TemplateAbilityInput = {
  id: EffectType;
  priority?: number;
  canUseWhenDead?: boolean;
  targetCount?: number;
  canTargetSelf?: boolean;
  requiresAliveTarget?: boolean;
};

type TemplateInput = {
  name?: string;
  alignment: Alignment;
  abilities: TemplateAbilityInput[];
};

type EffectResultResponse = {
  type: string;
  actorId: string;
  targetIds: string[];
  data?: Record<string, unknown>;
};

type AdvancePhaseResponse = MatchResponse & {
  resolution?: {
    effects: EffectResultResponse[];
  };
  voteResolution?: {
    candidateId: string;
    count: number;
    resultType: string;
  }[];
};

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
  return startMatchWithTemplates(matchId, [
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

async function startMatchWithTemplates(
  matchId: string,
  templates: TemplateInput[],
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
  effectType: string,
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
        effectType,
        targetIds,
      }),
    },
  );

  const body = (await response.json()) as MatchResponse;

  return { body, response };
}

async function advancePhaseHelper(matchId: string): Promise<{
  body: AdvancePhaseResponse;
  response: Response;
}> {
  const response = await fetch(`http://localhost:${port}/match/${matchId}/phase`, {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
  const body = (await response.json()) as AdvancePhaseResponse;
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

async function advanceToResolutionPhase(
  matchId: string,
): Promise<AdvancePhaseResponse> {
  let currentPhase = (await getMatch(matchId)).phase;
  let lastResponse: AdvancePhaseResponse | null = null;

  while (currentPhase !== "resolution") {
    const { response, body } = await advancePhaseHelper(matchId);
    if (!response.ok) {
      throw new Error(`Failed to advance phase: ${JSON.stringify(body)}`);
    }
    lastResponse = body;
    currentPhase = body.phase;
  }

  if (!lastResponse) {
    throw new Error("Resolution response was not produced");
  }

  return lastResponse;
}

function findPlayerByAbility(match: MatchResponse, abilityId: EffectType) {
  const template = match.templates.find((t) =>
    t.abilities.some((ability) => ability.id === abilityId),
  );
  if (!template) {
    throw new Error(`Template with ability '${abilityId}' not found`);
  }

  const player = match.players.find((p) => p.templateId === template.id);
  if (!player) {
    throw new Error(`Player with template '${template.id}' not found`);
  }

  return player;
}

async function getMatch(matchId: string): Promise<MatchResponse> {
  const response = await fetch(`http://localhost:${port}/match/${matchId}`, {
    method: "GET",
  });
  return (await response.json()) as MatchResponse;
}

async function castVoteHelper(
  matchId: string,
  voterId: string,
  targetId: string,
): Promise<{
  body: MatchResponse;
  response: Response;
}> {
  const response = await fetch(
    `http://localhost:${port}/match/${matchId}/vote`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        voterId,
        targetId,
      }),
    },
  );

  const body = (await response.json()) as MatchResponse;
  return { body, response };
}

async function advanceToVotingPhase(matchId: string): Promise<void> {
  let currentPhase = "discussion";
  while (currentPhase !== "voting") {
    const { response, body } = await advancePhaseHelper(matchId);
    if (!response.ok) {
      throw new Error(`Failed to advance phase: ${JSON.stringify(body)}`);
    }
    currentPhase = body.phase;
  }
}
