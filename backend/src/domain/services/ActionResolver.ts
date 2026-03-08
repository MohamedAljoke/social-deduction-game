import { Action, ResolutionStage } from "../entity/action";
import { Player } from "../entity/player";
import { Template } from "../entity/template";
import { EffectHandler } from "./EffectHandler";
import { EffectResult, ResolutionContext } from "./ResolutionContext";

export interface ResolutionResult {
  effects: EffectResult[];
}

export class ActionResolver {
  private handlers = new Map<string, EffectHandler>();

  public registerHandler(handler: EffectHandler): void {
    this.handlers.set(handler.effectType, handler);
  }

  resolve(
    actions: Action[],
    players: Player[],
    templates?: Template[],
  ): ResolutionResult {
    const ctx = new ResolutionContext();
    const playersById = new Map(players.map((p) => [p.id, p]));
    const staged = this.groupByStage(actions);

    for (const stage of [
      ResolutionStage.TARGET_MUTATION,
      ResolutionStage.DEFENSIVE,
      ResolutionStage.CANCELLATION,
      ResolutionStage.OFFENSIVE,
      ResolutionStage.READ,
    ]) {
      const stageActions = staged.get(stage) ?? [];
      stageActions.sort((a, b) => this.sortByPriority(a, b));

      for (const action of stageActions) {
        if (action.cancelled) {
          continue;
        }
        if (ctx.hasModifier(action.actorId, "roleblocked")) {
          action.cancelled = true;
          continue;
        }

        const handler = this.handlers.get(action.effectType);
        if (!handler) {
          continue;
        }

        handler.resolve(action, ctx, playersById, templates);
      }
    }

    for (const change of ctx.getStateChanges()) {
      if (change.type === "pending_death") {
        playersById.get(change.targetId)?.kill();
      }
    }

    return { effects: ctx.getResults() };
  }

  private groupByStage(actions: Action[]): Map<ResolutionStage, Action[]> {
    const grouped = new Map<ResolutionStage, Action[]>();

    for (const action of actions) {
      const bucket = grouped.get(action.stage) ?? [];
      bucket.push(action);
      grouped.set(action.stage, bucket);
    }

    return grouped;
  }

  private sortByPriority(a: Action, b: Action): number {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    if (a.actorId !== b.actorId) {
      return a.actorId.localeCompare(b.actorId);
    }

    if (a.effectType !== b.effectType) {
      return a.effectType.localeCompare(b.effectType);
    }

    return a.targetIds.join(",").localeCompare(b.targetIds.join(","));
  }
}
