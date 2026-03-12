import { afterEach, describe, expect, it, vi } from "vitest";
import { Ability, EffectType } from "../../domain/entity/ability";
import { Action, ResolutionStage } from "../../domain/entity/action";
import { Match, MatchStatus } from "../../domain/entity/match";
import { Phase } from "../../domain/entity/phase";
import { Player } from "../../domain/entity/player";
import {
  Alignment,
  Template,
  WinCondition,
  WinConditionConfig,
} from "../../domain/entity/template";
import { MatchDomainEvent } from "../../domain/events/match-events";
import {
  MatchAlreadyStarted,
  TargetNotAlive,
  TemplatePlayerCountMismatch,
} from "../../domain/errors";
import {
  AbilityActionFactory,
  MatchSnapshotMapper,
  MatchVoting,
  TemplateAssignmentService,
  WinConditionEvaluator,
} from "../../domain/services/match";
import { ActionResolver } from "../../domain/services/resolution";

function createPlayer(id: string, name = id): Player {
  return new Player({ id, name });
}

function createTemplate(
  id: string,
  alignment: Alignment,
  abilities: Ability[] = [],
  winCondition: WinCondition = WinCondition.TeamParity,
  winConditionConfig?: WinConditionConfig,
): Template {
  return new Template(
    id,
    id,
    alignment,
    abilities,
    winCondition,
    winConditionConfig,
  );
}

function createStartedMatch(players: Player[], templates: Template[]): Match {
  return new Match({
    id: "match-id",
    name: "Started Match",
    createdAt: new Date("2026-03-10T12:00:00.000Z"),
    status: MatchStatus.STARTED,
    players,
    phase: new Phase(),
    templates,
  });
}

describe("MatchVoting", () => {
  it("replaces an existing vote for the same voter", () => {
    const phase = new Phase();
    phase.nextPhase();
    const players = [
      createPlayer("alice"),
      createPlayer("bob"),
      createPlayer("charlie"),
    ];
    const voting = new MatchVoting();

    voting.submitVote(phase, players, "alice", "bob");
    voting.submitVote(phase, players, "alice", null);

    expect(voting.getVotes()).toEqual([{ voterId: "alice", targetId: null }]);
  });

  it("rejects dead targets and resolves the same elimination result", () => {
    const phase = new Phase();
    phase.nextPhase();
    const alice = createPlayer("alice");
    const bob = createPlayer("bob");
    const charlie = createPlayer("charlie");
    bob.kill();
    const voting = new MatchVoting();

    expect(() =>
      voting.submitVote(phase, [alice, bob, charlie], "alice", "bob"),
    ).toThrow(TargetNotAlive);

    bob.eliminate();
    const tieSafeVoting = new MatchVoting();
    const livingPlayers = [alice, charlie, createPlayer("diana")];
    tieSafeVoting.submitVote(phase, livingPlayers, "alice", "charlie");
    tieSafeVoting.submitVote(phase, livingPlayers, "charlie", "charlie");

    expect(tieSafeVoting.resolveRound()).toEqual({
      eliminatedPlayerId: "charlie",
      playerEliminatedThisRound: true,
    });
  });
});

describe("TemplateAssignmentService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pads templates and assigns one to each player", () => {
    const players = [createPlayer("a"), createPlayer("b"), createPlayer("c")];
    const service = new TemplateAssignmentService();
    vi.spyOn(Math, "random").mockReturnValue(0);

    const assigned = service.assign("lobby", players, [
      createTemplate("hero", Alignment.Hero),
    ]);

    expect(assigned).toHaveLength(3);
    expect(players.map((player) => player.getTemplateId())).toHaveLength(3);
    expect(players.every((player) => player.getTemplateId())).toBe(true);
  });

  it("preserves current start validation", () => {
    const service = new TemplateAssignmentService();

    expect(() =>
      service.assign("started", [createPlayer("a"), createPlayer("b")], []),
    ).toThrow(MatchAlreadyStarted);

    expect(() =>
      service.assign("lobby", [createPlayer("a"), createPlayer("b")], [
        createTemplate("one", Alignment.Hero),
        createTemplate("two", Alignment.Villain),
        createTemplate("three", Alignment.Hero),
      ]),
    ).toThrow(TemplatePlayerCountMismatch);
  });
});

describe("AbilityActionFactory", () => {
  it("creates an action with deduplicated targets and current priority data", () => {
    const actor = createPlayer("actor");
    const target = createPlayer("target");
    actor.assignTemplate("seer");

    const factory = new AbilityActionFactory();
    const action = factory.create(
      "actor",
      EffectType.Investigate,
      ["target", "target"],
      [actor, target],
      [
        createTemplate("seer", Alignment.Hero, [
          new Ability(EffectType.Investigate),
        ]),
      ],
    );

    expect(action).toEqual(
      new Action(
        "actor",
        EffectType.Investigate,
        1,
        ResolutionStage.READ,
        ["target"],
      ),
    );
  });
});

describe("WinConditionEvaluator", () => {
  it("preserves current alignment-parity winner rules", () => {
    const evaluator = new WinConditionEvaluator();
    const hero = createPlayer("hero");
    const villain = createPlayer("villain");
    hero.assignTemplate("hero-template");
    villain.assignTemplate("villain-template");

    const templates = [
      createTemplate("hero-template", Alignment.Hero),
      createTemplate("villain-template", Alignment.Villain),
    ];

    expect(evaluator.evaluate([hero, villain], templates)).toEqual({
        kind: "alignment",
        alignment: Alignment.Villain,
      });

    villain.kill();

    expect(evaluator.evaluate([hero, villain], templates)).toEqual({
      kind: "alignment",
      alignment: Alignment.Hero,
    });
  });

  it("allows a custom role to win by eliminating a target alignment", () => {
    const evaluator = new WinConditionEvaluator();
    const heroKiller = createPlayer("hero-killer");
    const citizen = createPlayer("citizen");
    const villain = createPlayer("villain");
    heroKiller.assignTemplate("hero-killer-template");
    citizen.assignTemplate("citizen-template");
    villain.assignTemplate("villain-template");

    const templates = [
      createTemplate(
        "hero-killer-template",
        Alignment.Hero,
        [new Ability(EffectType.Kill)],
        WinCondition.EliminateAlignment,
        { targetAlignment: Alignment.Villain },
      ),
      createTemplate("citizen-template", Alignment.Hero),
      createTemplate("villain-template", Alignment.Villain),
    ];

    expect(evaluator.evaluate([heroKiller, citizen, villain], templates)).toBeNull();

    villain.kill();

    expect(evaluator.evaluate([heroKiller, citizen, villain], templates)).toEqual({
      kind: "templates",
      templates: [
        {
          templateId: "hero-killer-template",
          templateName: "hero-killer-template",
          alignment: Alignment.Hero,
        },
      ],
    });
  });
});

describe("MatchSnapshotMapper", () => {
  it("maps the current response shape without changing field names", () => {
    const mapper = new MatchSnapshotMapper();
    const player = createPlayer("player");
    player.assignTemplate("citizen");
    const action = new Action(
      "player",
      EffectType.Investigate,
      1,
      ResolutionStage.READ,
      ["target"],
    );
    const snapshot = mapper.map({
      id: "match-id",
      name: "Test Match",
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
      status: MatchStatus.STARTED,
      players: [player],
      phase: "voting",
      actions: [action],
      templates: [
        createTemplate("citizen", Alignment.Hero, [
          new Ability(EffectType.Investigate),
        ]),
      ],
      votes: [{ voterId: "player", targetId: "target" }],
      config: { showVotingTransparency: true },
      winner: null,
      winnerAlignment: null,
      endedAt: null,
    });

    expect(snapshot).toEqual({
      id: "match-id",
      name: "Test Match",
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
      status: "started",
      players: [
        {
          id: "player",
          name: "player",
          status: "alive",
          templateId: "citizen",
        },
      ],
      phase: "voting",
      actions: [
        {
          actorId: "player",
          EffectType: "investigate",
          targetIds: ["target"],
          cancelled: false,
        },
      ],
      templates: [
        {
          id: "citizen",
          name: "citizen",
          alignment: "hero",
          abilities: [{ id: "investigate" }],
          winCondition: "team_parity",
          winConditionConfig: null,
        },
      ],
      votes: [{ voterId: "player", targetId: "target" }],
      config: { showVotingTransparency: true },
      winner: null,
      winnerAlignment: null,
      endedAt: null,
    });
  });
});

describe("Match aggregate regression", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits PlayerJoined with a typed serialized player payload", () => {
    const match = new Match({
      id: "match-id",
      name: "Join Events",
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
      status: MatchStatus.LOBBY,
    });
    const alice = createPlayer("alice", "Alice");

    match.addPlayer(alice);

    expect(match.pullEvents()).toEqual<MatchDomainEvent[]>([
      {
        type: "PlayerJoined",
        matchId: "match-id",
        player: alice.toJSON(),
      },
    ]);
    expect(match.pullEvents()).toEqual([]);
  });

  it("emits MatchStarted with invariant-safe player assignments", () => {
    const alice = createPlayer("alice");
    const bob = createPlayer("bob");
    const match = new Match({
      id: "match-id",
      name: "Start Events",
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
      status: MatchStatus.LOBBY,
      players: [alice, bob],
    });
    vi.spyOn(Math, "random").mockReturnValue(0);

    match.startWithTemplates([
      createTemplate("hero", Alignment.Hero),
      createTemplate("villain", Alignment.Villain),
    ]);

    const [event] = match.pullEvents();

    expect(event).toMatchObject({
      type: "MatchStarted",
      matchId: "match-id",
    });
    expect(event?.type).toBe("MatchStarted");
    if (event?.type !== "MatchStarted") {
      throw new Error("Expected MatchStarted event");
    }

    const assignedAlignments = new Map(
      event.playerAssignments.map((assignment) => [
        assignment.playerId,
        assignment.alignment,
      ]),
    );
    expect(assignedAlignments.get("alice")).toBeDefined();
    expect(assignedAlignments.get("bob")).toBeDefined();
    expect([...assignedAlignments.values()].sort()).toEqual(
      [Alignment.Hero, Alignment.Villain].sort(),
    );
    expect(event.playerAssignments.every((assignment) => assignment.templateId)).toBe(
      true,
    );
  });

  it("emits VoteSubmitted when a valid vote is recorded", () => {
    const alice = createPlayer("alice");
    const bob = createPlayer("bob");
    alice.assignTemplate("alice-template");
    bob.assignTemplate("bob-template");
    const match = createStartedMatch(
      [alice, bob],
      [
        createTemplate("alice-template", Alignment.Hero),
        createTemplate("bob-template", Alignment.Villain),
      ],
    );

    match.advancePhase();
    match.pullEvents();
    match.submitVote("alice", "bob");

    expect(match.pullEvents()).toEqual<MatchDomainEvent[]>([
      {
        type: "VoteSubmitted",
        matchId: "match-id",
        voterId: "alice",
        targetId: "bob",
      },
    ]);
  });

  it("emits PhaseAdvanced and MatchEnded when voting eliminates the last villain", () => {
    const hero = createPlayer("hero");
    const villain = createPlayer("villain");
    hero.assignTemplate("hero-template");
    villain.assignTemplate("villain-template");
    const match = createStartedMatch(
      [hero, villain],
      [
        createTemplate("hero-template", Alignment.Hero),
        createTemplate("villain-template", Alignment.Villain),
      ],
    );

    match.advancePhase();
    match.pullEvents();
    match.submitVote("hero", "villain");
    match.pullEvents();

    expect(match.advancePhase()).toBe("action");
    expect(match.pullEvents()).toEqual<MatchDomainEvent[]>([
      {
        type: "MatchEnded",
        matchId: "match-id",
        winner: {
          kind: "alignment",
          alignment: Alignment.Hero,
        },
      },
      {
        type: "PhaseAdvanced",
        matchId: "match-id",
        phase: "action",
      },
    ]);
  });

  it("emits ActionsResolved after resolution effects are applied", () => {
    const hero = createPlayer("hero");
    hero.assignTemplate("hero-template");
    const phase = new Phase();
    phase.nextPhase();
    phase.nextPhase();
    phase.nextPhase();
    const match = new Match({
      id: "match-id",
      name: "Resolution Events",
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
      status: MatchStatus.STARTED,
      players: [hero],
      phase,
      templates: [createTemplate("hero-template", Alignment.Hero)],
      actions: [
        new Action(
          "hero",
          EffectType.Investigate,
          1,
          ResolutionStage.READ,
          ["target"],
        ),
      ],
    });
    const resolutionEffect = {
      type: "investigate",
      actorId: "hero",
      targetIds: ["target"],
      data: { alignment: Alignment.Villain },
    };
    const resolver = {
      resolve: vi.fn().mockReturnValue({ effects: [resolutionEffect], playerStatuses: new Map() }),
    } as unknown as ActionResolver;

    match.resolveActions(resolver);

    expect(match.pullEvents()).toContainEqual({
      type: "ActionsResolved",
      matchId: "match-id",
      effects: [resolutionEffect],
    });
  });

  it("advances from voting by eliminating the same player and clearing votes", () => {
    const alice = createPlayer("alice");
    const bob = createPlayer("bob");
    const charlie = createPlayer("charlie");
    const match = new Match({
      id: "match-id",
      name: "Refactor Lock",
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
      status: MatchStatus.STARTED,
      players: [alice, bob, charlie],
      phase: new Phase(),
      templates: [
        createTemplate("alice-template", Alignment.Hero),
        createTemplate("bob-template", Alignment.Villain),
        createTemplate("charlie-template", Alignment.Hero),
      ],
    });

    alice.assignTemplate("alice-template");
    bob.assignTemplate("bob-template");
    charlie.assignTemplate("charlie-template");

    match.advancePhase();
    match.submitVote("alice", "bob");
    match.submitVote("charlie", "bob");

    expect(match.advancePhase()).toBe("action");
    expect(bob.getStatus()).toBe("eliminated");
    expect(match.toJSON().votes).toEqual([]);
  });

  it("starts with templates and resets winner metadata", () => {
    const alice = createPlayer("alice");
    const bob = createPlayer("bob");
    const match = new Match({
      id: "match-id",
      name: "Reset Winner",
      createdAt: new Date("2026-03-10T12:00:00.000Z"),
      status: MatchStatus.LOBBY,
      players: [alice, bob],
      winner: {
        kind: "alignment",
        alignment: Alignment.Villain,
      },
      winnerAlignment: Alignment.Villain,
      endedAt: new Date("2026-03-10T13:00:00.000Z"),
    });
    vi.spyOn(Math, "random").mockReturnValue(0);

    match.startWithTemplates([
      createTemplate("hero", Alignment.Hero),
      createTemplate("villain", Alignment.Villain),
    ]);

    const snapshot = match.toJSON();
    expect(snapshot.status).toBe("started");
    expect(snapshot.winner).toBeNull();
    expect(snapshot.winnerAlignment).toBeNull();
    expect(snapshot.endedAt).toBeNull();
    expect(snapshot.players.every((player) => player.templateId)).toBe(true);
  });
});
