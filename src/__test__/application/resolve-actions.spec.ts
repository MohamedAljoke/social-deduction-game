import { describe, expect, it } from "vitest";
import { ResolveActionsUseCase } from "../../application/ResolveActions";
import { InMemoryMatchRepository } from "../../infrastructure/persistence/InMemoryMatchRepository";
import { Match, MatchStatus } from "../../domain/entity/match";
import { Player } from "../../domain/entity/player";
import { Template, Alignment } from "../../domain/entity/template";
import { Ability, AbilityId } from "../../domain/entity/ability";
import { Action } from "../../domain/entity/action";
import { Phase } from "../../domain/entity/phase";
import { defaultAbilityCatalog } from "../../domain/abilities";

describe("ResolveActionsUseCase", () => {
  it("applies transitions, clears actions, and finishes match on win", async () => {
    const repository = new InMemoryMatchRepository();
    const useCase = new ResolveActionsUseCase(repository);

    const villain = new Player({ id: "villain", name: "villain" });
    const hero = new Player({ id: "hero", name: "hero" });

    const templates = [
      new Template("villain_template", Alignment.Villain, [
        buildAbility(AbilityId.Kill),
      ]),
      new Template("hero_template", Alignment.Hero, [
        buildAbility(AbilityId.Protect),
      ]),
    ];

    villain.assignTemplate("villain_template");
    hero.assignTemplate("hero_template");

    const match = new Match({
      id: "match_resolution",
      name: "match_resolution",
      createdAt: new Date(),
      status: MatchStatus.STARTED,
      phase: resolutionPhase(),
      players: [villain, hero],
      templates,
      actions: [new Action("villain", AbilityId.Kill, ["hero"])],
    });

    await repository.save(match);

    const result = await useCase.execute({ matchId: match.id });

    expect(result.actions).toHaveLength(0);
    expect(result.players.find((player) => player.id === "hero")?.status).toBe(
      "dead",
    );
    expect(result.status).toBe("finished");
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

function resolutionPhase(): Phase {
  const phase = new Phase();
  phase.nextPhase();
  phase.nextPhase();
  phase.nextPhase();
  return phase;
}
