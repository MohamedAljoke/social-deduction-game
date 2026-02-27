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
├── application/      # CreateMatch, JoinMatch, StartMatch, ListMatches
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

## Application Layer (Use Cases)

Use cases in `src/application/` orchestrate domain logic. They are transport-agnostic and can be called from HTTP, WebSocket, or CLI.

### CreateMatch
```typescript
interface CreateMatchInput {
  name?: string;
}
```

### JoinMatch
```typescript
interface JoinMatchInput {
  matchId: string;
  playerName: string;
}
```

### StartMatch
```typescript
interface StartMatchInput {
  matchId: string;
  templates: {
    alignment: Alignment;
    abilities: { id: AbilityId }[];
  }[];
}
```

### ListMatches
```typescript
interface ListMatchesInput {} // No input required
```

## Domain Entities

Entities live in `src/domain/entity/`:

### Match
- `id: string` - Unique identifier
- `name: string` - Display name
- `status: MatchStatus` - LOBBY | STARTED | FINISHED
- `players: Player[]` - Players in the match
- `phase: Phase` - Current game phase
- `actions: Action[]` - Actions taken this round
- `templates: Template[]` - Role templates assigned to players

### Player
- `id: string` - Unique identifier
- `name: string` - Display name
- `status: PlayerStatus` - ALIVE | DEAD | ELIMINATED
- `templateId?: string` - Assigned role template

### Template
- `id: string` - Unique identifier
- `alignment: Alignment` - Villain | Hero | Neutral
- `abilities: Ability[]` - Abilities this role has
- `winCondition: WinCondition` - default | vote_eliminated
- `endsGameOnWin: boolean` - Whether this role winning ends the game

### Ability
- `id: AbilityId` - Kill | Protect | Roleblock | Investigate
- `canUseWhenDead: boolean` - Whether dead players can use this
- `targetCount: number` - Number of targets required
- `canTargetSelf: boolean` - Whether self-targeting is allowed
- `requiresAliveTarget: boolean` - Whether targets must be alive

### Phase
- `current: PhaseType` - discussion | voting | action | resolution

### Action
- `actorId: string` - Player who performed the action
- `abilityId: AbilityId` - Ability used
- `targetIds: string[]` - Targets of the ability
- `cancelled: boolean` - Whether the action was cancelled

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
