import { AbilityCatalog } from "../abilities";
import { AbilityId } from "../entity/ability";
import { Match } from "../entity/match";
import { ResolutionState } from "./ResolutionState";
import { runHooks } from "./hooks";
import {
  ResolutionExecutionContext,
  ResolutionHandler,
  ResolutionHook,
} from "./handlers/types";
import {
  ActionIntent,
  ResolutionEvent,
  ResolutionResult,
  ResolutionTransition,
  TIMING_WINDOW_ORDER,
} from "./types";

export class ResolutionPipeline {
  constructor(
    private readonly abilityCatalog: AbilityCatalog,
    private readonly handlers: ReadonlyMap<AbilityId, ResolutionHandler>,
    private readonly hooks: ReadonlyArray<ResolutionHook>,
  ) {}

  resolve(match: Match): ResolutionResult {
    const intents = this.normalizeIntents(match);
    if (intents.length === 0) {
      return {
        events: [],
        transitions: [],
        intents: [],
      };
    }

    const state = new ResolutionState();
    const events: ResolutionEvent[] = [];
    const transitions: ResolutionTransition[] = [];
    const scheduledKills = new Set<string>();

    const context: ResolutionExecutionContext = {
      match,
      state,
      emit: (event: ResolutionEvent) => {
        events.push(event);
      },
      queueTransition: (transition: ResolutionTransition) => {
        if (transition.type === "kill_player") {
          if (scheduledKills.has(transition.targetId)) {
            return;
          }
          scheduledKills.add(transition.targetId);
        }

        transitions.push(transition);
      },
      addStatus: (status, playerId, record) => {
        state.addStatus(status, playerId, record);
      },
      hasStatus: (status, playerId) => {
        return state.hasStatus(status, playerId);
      },
    };

    for (const intent of intents) {
      const hookContext = {
        intent,
        match,
        state,
      };

      const beforeAction = runHooks("beforeAction", this.hooks, hookContext);
      if (beforeAction.cancelled) {
        events.push({
          type: "ability_failed",
          actorId: intent.actorId,
          abilityId: intent.abilityId,
          reason: beforeAction.reason ?? "invalid_target",
        });
        continue;
      }

      const handler = this.handlers.get(intent.abilityId);
      if (!handler) {
        events.push({
          type: "ability_failed",
          actorId: intent.actorId,
          abilityId: intent.abilityId,
          reason: "handler_missing",
        });
        continue;
      }

      const beforeApply = runHooks("beforeApply", this.hooks, hookContext);
      if (beforeApply.cancelled) {
        events.push({
          type: "ability_failed",
          actorId: intent.actorId,
          abilityId: intent.abilityId,
          reason: beforeApply.reason ?? "invalid_target",
        });
        continue;
      }

      handler.execute({
        intent,
        intents,
        context,
      });

      runHooks("afterApply", this.hooks, hookContext);
    }

    return {
      events,
      transitions,
      intents,
    };
  }

  private normalizeIntents(match: Match): ActionIntent[] {
    const intents = match
      .getActions()
      .filter((action) => !action.cancelled)
      .map((action, index) => {
        const definition = this.abilityCatalog.getDefinition(action.abilityId);

        return {
          actionId: `${index}:${action.actorId}:${action.abilityId}`,
          actorId: action.actorId,
          abilityId: action.abilityId,
          targetIds: [...action.targetIds],
          timingWindow: definition.timingWindow,
          priority: definition.priority,
        } as const;
      });

    intents.sort((left, right) => {
      const timingCmp =
        TIMING_WINDOW_ORDER[left.timingWindow] -
        TIMING_WINDOW_ORDER[right.timingWindow];
      if (timingCmp !== 0) {
        return timingCmp;
      }

      const priorityCmp = right.priority - left.priority;
      if (priorityCmp !== 0) {
        return priorityCmp;
      }

      const actorCmp = left.actorId.localeCompare(right.actorId);
      if (actorCmp !== 0) {
        return actorCmp;
      }

      return left.actionId.localeCompare(right.actionId);
    });

    return intents;
  }
}
