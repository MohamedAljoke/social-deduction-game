import { describe, expect, it } from "vitest";
import { Action } from "../../domain/entity/action";
import { EffectType } from "../../domain/entity/ability";
import { Player, PlayerStatus } from "../../domain/entity/player";
import { Alignment, Template } from "../../domain/entity/template";
import { ActionResolver } from "../../domain/services/ActionResolver";
import { ResolutionStage } from "../../domain/services/EffectHandler";
import { InvestigateHandler } from "../../domain/services/handlers/InvestigateHandler";
import { KillHandler } from "../../domain/services/handlers/KillHandler";
import { ProtectHandler } from "../../domain/services/handlers/ProtectHandler";
import { RoleblockHandler } from "../../domain/services/handlers/RoleblockHandler";

describe("ActionResolver", () => {
  it("protect blocks kill", () => {
    const killer = new Player({ id: "killer", name: "killer" });
    const protector = new Player({ id: "protector", name: "protector" });
    const target = new Player({ id: "target", name: "target" });

    const resolver = new ActionResolver();
    resolver.registerHandler(new ProtectHandler());
    resolver.registerHandler(new KillHandler());

    const protect = new Action(
      protector.id,
      EffectType.Protect,
      2,
      ResolutionStage.DEFENSIVE,
      [target.id],
    );
    const kill = new Action(
      killer.id,
      EffectType.Kill,
      0,
      ResolutionStage.OFFENSIVE,
      [target.id],
    );

    const result = resolver.resolve([protect, kill], [killer, protector, target]);

    expect(target.getStatus()).toBe(PlayerStatus.ALIVE);
    expect(result.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "protect" }),
        expect.objectContaining({ type: "kill_blocked" }),
      ]),
    );
  });

  it("roleblocked actor action is cancelled", () => {
    const blocker = new Player({ id: "blocker", name: "blocker" });
    const killer = new Player({ id: "killer", name: "killer" });
    const target = new Player({ id: "target", name: "target" });

    const resolver = new ActionResolver();
    resolver.registerHandler(new RoleblockHandler());
    resolver.registerHandler(new KillHandler());

    const roleblock = new Action(
      blocker.id,
      EffectType.Roleblock,
      3,
      ResolutionStage.CANCELLATION,
      [killer.id],
    );
    const kill = new Action(
      killer.id,
      EffectType.Kill,
      0,
      ResolutionStage.OFFENSIVE,
      [target.id],
    );

    const result = resolver.resolve([roleblock, kill], [blocker, killer, target]);

    expect(kill.cancelled).toBe(true);
    expect(target.getStatus()).toBe(PlayerStatus.ALIVE);
    expect(result.effects).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "roleblock" })]),
    );
    expect(result.effects).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "kill" })]),
    );
  });

  it("investigate returns target alignment", () => {
    const investigator = new Player({ id: "investigator", name: "investigator" });
    const target = new Player({ id: "target", name: "target" });
    target.assignTemplate("villain_template");

    const templates = [
      new Template("villain_template", Alignment.Villain, [], "default", true),
    ];

    const resolver = new ActionResolver();
    resolver.registerHandler(new InvestigateHandler());

    const investigate = new Action(
      investigator.id,
      EffectType.Investigate,
      1,
      ResolutionStage.READ,
      [target.id],
    );

    const result = resolver.resolve([investigate], [investigator, target], templates);

    expect(result.effects).toEqual([
      {
        type: "investigate",
        actorId: investigator.id,
        targetIds: [target.id],
        data: { alignment: Alignment.Villain },
      },
    ]);
  });

  it("commit phase applies pending deaths", () => {
    const killer = new Player({ id: "killer", name: "killer" });
    const target = new Player({ id: "target", name: "target" });

    const resolver = new ActionResolver();
    resolver.registerHandler(new KillHandler());

    const kill = new Action(
      killer.id,
      EffectType.Kill,
      0,
      ResolutionStage.OFFENSIVE,
      [target.id],
    );

    const result = resolver.resolve([kill], [killer, target]);

    expect(target.getStatus()).toBe(PlayerStatus.DEAD);
    expect(result.effects).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "kill" })]),
    );
  });
});
