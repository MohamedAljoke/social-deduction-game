export class DomainError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export class ValidationError extends Error {
  public readonly statusCode = 400;
  public readonly issues: string[];

  constructor(issues: string[]) {
    super("Validation failed");
    this.issues = issues;
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

export class PlayerHasNoTemplate extends DomainError {
  constructor() {
    super("Player has NO template", "template_not_found");
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

export class InvalidPhase extends DomainError {
  constructor() {
    super("Ability can only be used during action phase", "invalid_phase");
  }
}

export class MatchNotStarted extends DomainError {
  constructor() {
    super("Match must be started to use abilities", "match_not_started");
  }
}

export class MatchNotFinished extends DomainError {
  constructor() {
    super("Match must be finished to start a rematch", "match_not_finished");
  }
}

export class PlayerNotInMatch extends DomainError {
  constructor() {
    super("Player is not part of this match", "player_not_in_match");
  }
}

export class TargetNotAlive extends DomainError {
  constructor() {
    super("Target must be alive", "target_not_alive");
  }
}
