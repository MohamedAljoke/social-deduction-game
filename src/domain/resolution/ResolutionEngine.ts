import { AbilityCatalog, defaultAbilityCatalog } from "../abilities";
import { Match } from "../entity/match";
import { RoleblockBeforeActionHook } from "./hooks";
import { ResolutionPipeline } from "./ResolutionPipeline";
import {
  createDefaultResolutionHandlers,
  createResolutionHandlerMap,
  ResolutionHook,
} from "./handlers";
import { ResolutionResult, ResolutionTransition } from "./types";

export class ResolutionEngine {
  private readonly pipeline: ResolutionPipeline;

  constructor(
    abilityCatalog: AbilityCatalog = defaultAbilityCatalog,
    hooks: ReadonlyArray<ResolutionHook> = [new RoleblockBeforeActionHook()],
  ) {
    const handlers = createResolutionHandlerMap(createDefaultResolutionHandlers());
    this.pipeline = new ResolutionPipeline(abilityCatalog, handlers, hooks);
  }

  resolve(match: Match): ResolutionResult {
    return this.pipeline.resolve(match);
  }
}

export function applyResolutionTransitions(
  match: Match,
  transitions: ReadonlyArray<ResolutionTransition>,
): void {
  for (const transition of transitions) {
    switch (transition.type) {
      case "kill_player": {
        const target = match
          .getPlayers()
          .find((player) => player.id === transition.targetId);
        if (target && target.isAlive()) {
          target.kill();
        }
        break;
      }
    }
  }
}
