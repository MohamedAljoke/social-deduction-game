import { PhaseType, PHASE_ORDER } from "../models/phase";
import { PhaseHook, MatchContext } from "./MatchContext";

export class PhaseManager {
  private onLeave = new Map<PhaseType, PhaseHook[]>();
  private onEnter = new Map<PhaseType, PhaseHook[]>();

  registerOnLeave(phase: PhaseType, hook: PhaseHook): void {
    const hooks = this.onLeave.get(phase) ?? [];
    hooks.push(hook);
    this.onLeave.set(phase, hooks);
  }

  registerOnEnter(phase: PhaseType, hook: PhaseHook): void {
    const hooks = this.onEnter.get(phase) ?? [];
    hooks.push(hook);
    this.onEnter.set(phase, hooks);
  }

  advance(context: MatchContext): PhaseType {
    const current = context.getCurrentPhase();
    
    const leaveHooks = this.onLeave.get(current) ?? [];
    for (const hook of leaveHooks) {
      hook(context);
    }

    const currentIndex = PHASE_ORDER.indexOf(current);
    const nextIndex = (currentIndex + 1) % PHASE_ORDER.length;
    const next = PHASE_ORDER[nextIndex];

    const enterHooks = this.onEnter.get(next) ?? [];
    for (const hook of enterHooks) {
      hook(context);
    }

    return next;
  }
}
