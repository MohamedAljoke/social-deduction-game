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
  type: string;
  actorId: string;
  targetIds: string[];
  data?: Record<string, unknown>;
}

export class ResolutionContext {
  private modifiers = new Map<string, Set<string>>();
  private stateChanges: StateChange[] = [];
  private results: EffectResult[] = [];

  public addModifier(playerId: string, mod: string): void {
    const mods = this.modifiers.get(playerId) ?? new Set<string>();
    mods.add(mod);
    this.modifiers.set(playerId, mods);
  }

  public hasModifier(playerId: string, mod: string): boolean {
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
