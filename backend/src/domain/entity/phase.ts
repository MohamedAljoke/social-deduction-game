import { InvalidPhase } from "../errors";

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

  public isDiscussion(): boolean {
    return this.current === "discussion";
  }

  public isVoting(): boolean {
    return this.current === "voting";
  }

  public isAction(): boolean {
    return this.current === "action";
  }

  public isResolution(): boolean {
    return this.current === "resolution";
  }

  public assertCanVote(): void {
    if (!this.isVoting()) {
      throw new InvalidPhase();
    }
  }

  public assertCanUseAbility(): void {
    if (!this.isAction()) {
      throw new InvalidPhase();
    }
  }

  public assertCanResolve(): void {
    if (!this.isResolution()) {
      throw new InvalidPhase();
    }
  }

  public nextPhase(): PhaseType {
    const currentIndex = PHASE_ORDER.indexOf(this.current);
    const nextIndex = (currentIndex + 1) % PHASE_ORDER.length;
    this.current = PHASE_ORDER[nextIndex];

    return this.current;
  }
}
