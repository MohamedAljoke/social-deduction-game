export const PHASE_ORDER = [
  "discussion",
  "voting",
  "action",
  "resolution",
] as const;

export type PhaseType = (typeof PHASE_ORDER)[number];

export class Phase {
  private current: PhaseType = PHASE_ORDER[0];

  public getCurrentPhase(): PhaseType {
    return this.current;
  }

  public nextPhase(): PhaseType {
    const currentIndex = PHASE_ORDER.indexOf(this.current);
    const nextIndex = (currentIndex + 1) % PHASE_ORDER.length;
    this.current = PHASE_ORDER[nextIndex];

    return this.current;
  }
}
