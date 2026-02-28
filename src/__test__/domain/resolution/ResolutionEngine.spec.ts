import { describe, expect, it } from "vitest";
import {
  applyResolutionTransitions,
  ResolutionEngine,
} from "../../../domain/resolution";
import { Match, MatchStatus } from "../../../domain/entity/match";
import { Player } from "../../../domain/entity/player";
import { Template, Alignment } from "../../../domain/entity/template";
import { AbilityId, Ability } from "../../../domain/entity/ability";
import { Action } from "../../../domain/entity/action";
import { defaultAbilityCatalog } from "../../../domain/abilities";

describe("ResolutionEngine", () => {
  it("applies protection before kill", () => {
    const match = createMatch();
    const engine = new ResolutionEngine();

    match.addAction(new Action("killer", AbilityId.Kill, ["target"]));
    match.addAction(new Action("support", AbilityId.Protect, ["target"]));

    const result = engine.resolve(match);
    applyResolutionTransitions(match, result.transitions);

    const target = match.getPlayers().find((player) => player.id === "target");

    expect(target?.isAlive()).toBe(true);
    expect(
      result.events.some((event) => event.type === "player_protected"),
    ).toBe(true);
    expect(result.events.some((event) => event.type === "player_killed")).toBe(
      false,
    );
  });

  it("cancels blocked actor ability via hook", () => {
    const match = createMatch();
    const engine = new ResolutionEngine();

    match.addAction(new Action("support", AbilityId.Roleblock, ["killer"]));
    match.addAction(new Action("killer", AbilityId.Kill, ["target"]));

    const result = engine.resolve(match);
    applyResolutionTransitions(match, result.transitions);

    const target = match.getPlayers().find((player) => player.id === "target");

    expect(target?.isAlive()).toBe(true);
    expect(
      result.events.some(
        (event) =>
          event.type === "ability_failed" &&
          event.actorId === "killer" &&
          event.reason === "actor_roleblocked",
      ),
    ).toBe(true);
  });

  it("sorts same-priority actions deterministically", () => {
    const match = createMatch();
    const engine = new ResolutionEngine();

    match.addAction(new Action("support", AbilityId.Kill, ["target"]));
    match.addAction(new Action("extra", AbilityId.Kill, ["killer"]));

    const result = engine.resolve(match);

    const killerEvents = result.events.filter(
      (event) => event.type === "player_killed",
    );

    expect(result.intents.map((intent) => intent.actorId)).toEqual([
      "extra",
      "support",
    ]);
    expect(killerEvents).toHaveLength(2);
    expect(killerEvents[0]).toMatchObject({
      type: "player_killed",
      actorId: "extra",
      targetId: "killer",
    });
    expect(killerEvents[1]).toMatchObject({
      type: "player_killed",
      actorId: "support",
      targetId: "target",
    });
  });
});

function buildAbility(abilityId: AbilityId): Ability {
  const definition = defaultAbilityCatalog.getDefinition(abilityId);

  return new Ability(
    abilityId,
    definition.targeting.canUseWhenDead,
    definition.targeting.targetCount,
    definition.targeting.canTargetSelf,
    definition.targeting.requiresAliveTarget,
  );
}

function createMatch(): Match {
  const killer = new Player({ id: "killer", name: "killer" });
  const support = new Player({ id: "support", name: "support" });
  const target = new Player({ id: "target", name: "target" });
  const extra = new Player({ id: "extra", name: "extra" });

  const templates = [
    new Template("t_killer", Alignment.Villain, [buildAbility(AbilityId.Kill)]),
    new Template("t_support", Alignment.Hero, [
      buildAbility(AbilityId.Protect),
      buildAbility(AbilityId.Roleblock),
    ]),
    new Template("t_target", Alignment.Hero, [
      buildAbility(AbilityId.Investigate),
    ]),
    new Template("t_extra", Alignment.Hero, [buildAbility(AbilityId.Kill)]),
  ];

  killer.assignTemplate("t_killer");
  support.assignTemplate("t_support");
  target.assignTemplate("t_target");
  extra.assignTemplate("t_extra");

  return new Match({
    id: "match",
    name: "match",
    createdAt: new Date(),
    status: MatchStatus.STARTED,
    players: [killer, support, target, extra],
    templates,
    actions: [],
  });
}
