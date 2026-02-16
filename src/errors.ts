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
