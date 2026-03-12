import type { EffectResultType, Modifier } from "../../../../../shared/src/resolution-types";

export type { EffectResultType, Modifier };

export type StateChange =
  | {
      type: "pending_death";
      targetId: string;
      sourceActionActorId: string;
    }
  | {
      type: "vote_shield";
      targetId: string;
      sourceActionActorId: string;
    };

export interface EffectResult {
  type: EffectResultType;
  actorId: string;
  targetIds: string[];
  data?: Record<string, unknown>;
}

export class ResolutionContext {
  private modifiers = new Map<string, Set<Modifier>>();
  private stateChanges: StateChange[] = [];
  private results: EffectResult[] = [];

  public addModifier(playerId: string, mod: Modifier): void {
    const mods = this.modifiers.get(playerId) ?? new Set<Modifier>();
    mods.add(mod);
    this.modifiers.set(playerId, mods);
  }

  public hasModifier(playerId: string, mod: Modifier): boolean {
    return this.modifiers.get(playerId)?.has(mod) ?? false;
  }

  public addStateChange(change: StateChange): void {
    this.stateChanges.push(change);
  }

  public getStateChanges(): StateChange[] {
    return this.stateChanges;
  }

  public pushResult(result: EffectResult): void {
    this.results.push(result);
  }

  public getResults(): EffectResult[] {
    return this.results;
  }
}
