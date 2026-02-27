# Project Structure Guide

## Overview

This is a **general-purpose social deduction game** framework - not Among Us, Werewolf, or Mafia specifically. The architecture is designed to support any social deduction mechanics through flexible templates, abilities, and phases.

## Layer Structure

```
src/
├── domain/           # Business logic (no external dependencies)
│   ├── entity/       # Match, Player, Template, Ability, Phase, Action
│   ├── errors.ts     # Domain errors
│   └── ports/        # Repository interfaces
├── application/      # Use cases (orchestrates domain)
├── infrastructure/   # Adapters
│   ├── http/
│   │   ├── routes/  # HTTP route handlers
│   │   ├── validators/  # Zod schemas for request validation
│   │   └── *.ts     # Server adapters (Express, Hono)
│   └── persistence/ # Repository implementations
```

## Validators

Validators live in `src/infrastructure/http/validators/` and use **Zod** for runtime validation of HTTP request bodies.

```typescript
import { z } from "zod";

export const CreateMatchSchema = z.object({
  name: z.string().optional(),
});

export type CreateMatchBody = z.infer<typeof CreateMatchSchema>;
```

**Pattern**: Each endpoint has a corresponding Zod schema that validates the request body. Types are inferred from schemas for use in routes.

## Domain

All business logic belongs in `src/domain/`. This includes:

- **Entities**: Match, Player, Template, Ability, Phase, Action
- **Business Rules**: Match status transitions, player management, ability targeting
- **Errors**: Domain-specific errors (e.g., `MatchNotFound`, `InsufficientPlayers`)

### Key Principle

**Business rules must not depend on HTTP**. The domain has no knowledge of HTTP requests, responses, or WebSockets. This allows the same use cases to work with different transport layers.

## Errors

Errors are defined in `src/domain/errors.ts`:

```typescript
export class DomainError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export class MatchNotFound extends DomainError {
  constructor() {
    super("Match not found", "match_not_found");
  }
}
```

## Important: HTTP vs WebSocket

Some game actions require **real-time communication** and will need WebSocket support later (e.g., live ability usage, phase transitions).

### Current Pattern (HTTP)

```typescript
// Routes receive HTTP requests, validate body, call use case
server.register("post", "/match/:matchId/start", async (req, res) => {
  const body = validateBody(StartMatchSchema, req.body);
  const result = await useCase.execute({ matchId, templates: body.templates });
  res.status(200).json(result);
});
```

### Future Pattern (WebSocket)

When adding WebSocket support:

1. Keep use cases in `src/application/` - they are transport-agnostic
2. Create WebSocket adapters in `src/infrastructure/websocket/`
3. Use the **same use cases** - just call them from WebSocket handlers instead of HTTP handlers

```typescript
// Example future WebSocket handler (pseudo-code)
websocket.on("use_ability", (data) => {
  const body = validateBody(UseAbilitySchema, data);
  const result = useCase.execute(body);
  websocket.emit("ability_used", result);
});
```

## Adding a New Feature

1. **Domain**: Add business logic in `src/domain/entity/` if needed
2. **Application**: Create use case in `src/application/`
3. **Validators**: Add Zod schema in `src/infrastructure/http/validators/`
4. **Routes**: Register endpoint in `src/infrastructure/http/routes/`

## Notes

- This is NOT Werewolf/Mafia/Among Us - it's a flexible framework
- Templates define roles (alignment + abilities)
- Phases control game flow
- Actions represent player ability usage
