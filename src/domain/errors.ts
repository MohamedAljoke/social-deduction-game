import { PhaseType } from "./phase";

export class DomainError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export class PlayerNotFound extends DomainError {
  constructor() {
    super("Player was not found", "player_not_found");
  }
}

export class WrongPhaseError extends DomainError {
  constructor(expectedPhase: PhaseType, currentPhase: PhaseType) {
    super(
      `wrong phase expected ${expectedPhase}, but got ${currentPhase}`,
      "wrong_phase",
    );
  }
}
export class MissingTemplate extends DomainError {
  constructor() {
    super("no template found", "template_not_found");
  }
}
export class AbilityDoesNotBelongToUser extends DomainError {
  constructor() {
    super("ability does not belong to user", "ability_not_found");
  }
}
export class PlayerIsDeadError extends DomainError {
  constructor() {
    super("ability can not be used by a dead player", "player_dead");
  }
}
