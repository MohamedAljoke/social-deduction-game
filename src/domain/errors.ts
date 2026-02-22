import { PhaseType } from "./models";

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

export class MatchNotFound extends DomainError {
  constructor() {
    super("Match not found", "match_not_found");
  }
}

export class MatchAlreadyStarted extends DomainError {
  constructor() {
    super("Cannot join after match started", "match_already_started");
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

export class TemplateNotFound extends DomainError {
  constructor() {
    super("Template not found", "template_not_found");
  }
}

export class InsufficientPlayers extends DomainError {
  constructor() {
    super("Need at least 2 players to start", "insufficient_players");
  }
}

export class TemplatePlayerCountMismatch extends DomainError {
  constructor(templateCount: number, playerCount: number) {
    super(
      `Template count (${templateCount}) must match player count (${playerCount})`,
      "template_player_count_mismatch",
    );
  }
}

export class InvalidTargetCount extends DomainError {
  constructor(expected: number, actual: number) {
    super(
      `Invalid target count: expected ${expected}, got ${actual}`,
      "invalid_target_count",
    );
  }
}

export class CannotTargetSelf extends DomainError {
  constructor() {
    super("Cannot target yourself", "cannot_target_self");
  }
}
