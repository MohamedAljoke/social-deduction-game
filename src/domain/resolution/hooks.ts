import { ResolutionStatus } from "./ResolutionState";
import {
  ResolutionHook,
  ResolutionHookContext,
  ResolutionHookDecision,
  ResolutionHookPoint,
} from "./handlers/types";

const ALLOW: ResolutionHookDecision = { cancelled: false };

export class RoleblockBeforeActionHook implements ResolutionHook {
  readonly id = "roleblock_before_action";
  readonly points: ReadonlyArray<ResolutionHookPoint> = ["beforeAction"];

  run(
    point: ResolutionHookPoint,
    context: ResolutionHookContext,
  ): ResolutionHookDecision {
    if (point !== "beforeAction") {
      return ALLOW;
    }

    if (!context.state.hasStatus(ResolutionStatus.Roleblocked, context.intent.actorId)) {
      return ALLOW;
    }

    return {
      cancelled: true,
      reason: "actor_roleblocked",
    };
  }
}

export function runHooks(
  point: ResolutionHookPoint,
  hooks: ReadonlyArray<ResolutionHook>,
  context: ResolutionHookContext,
): ResolutionHookDecision {
  for (const hook of hooks) {
    if (!hook.points.includes(point)) {
      continue;
    }

    const decision = hook.run(point, context);
    if (decision.cancelled) {
      return decision;
    }
  }

  return ALLOW;
}
