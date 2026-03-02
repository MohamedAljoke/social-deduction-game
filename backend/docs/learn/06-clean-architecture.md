# Clean Architecture Layers

How this project organizes code into layers.

## Layers Overview

```
┌─────────────────────────────────────┐
│ Infrastructure (HTTP, Persistence) │
├─────────────────────────────────────┤
│ Application (Use Cases)             │
├─────────────────────────────────────┤
│ Domain (Entities, Ports, Errors)    │
└─────────────────────────────────────┘
```

Each layer only knows about the layer below it.

## Domain Layer

**Location:** `src/domain/`

Pure business logic. No external dependencies.

| Folder | Purpose | Examples |
|--------|---------|----------|
| `entity/` | Core business objects | `Match`, `Player`, `Ability` |
| `ports/persistence/` | Interfaces for data access | `MatchRepository`, `TemplateRepository` |
| `errors.ts` | Domain-specific errors | `MatchNotFound`, `InvalidPhase` |

```typescript
// src/domain/entity/match.ts
export class Match {
  constructor(
    public readonly id: string,
    public readonly templateId: string,
    public readonly players: Player[],
    public phase: Phase
  ) {}
  
  start() { /* game logic */ }
  addPlayer(player: Player) { /* ... */ }
}
```

No imports from `application/` or `infrastructure/` - this is the core.

## Application Layer

**Location:** `src/application/`

Use cases that orchestrate domain objects.

| File | Responsibility |
|------|----------------|
| `CreateMatch.ts` | Create new game |
| `StartMatch.ts` | Begin game, assign roles |
| `JoinMatch.ts` | Add player to lobby |
| `AdvancePhase.ts` | Move to next game phase |
| `UseAbility.ts` | Execute ability action |
| `GetMatch.ts` | Retrieve match by ID |
| `ListMatchs.ts` | List all matches |

```typescript
// src/application/CreateMatch.ts
export class CreateMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}
  
  async execute(input: CreateMatchInput): Promise<Match> {
    const template = await this.templateRepo.findById(input.templateId);
    if (!template) throw new Error("Template not found");
    
    const match = new Match(uuid(), template.id, [], Phase.LOBBY);
    await this.repository.save(match);
    return match;
  }
}
```

Use cases depend on **domain interfaces** (ports), not infrastructure.

## Infrastructure Layer

**Location:** `src/infrastructure/`

External concerns: HTTP servers, databases, third-party services.

| Folder | Purpose |
|--------|---------|
| `http/` | HTTP adapters, routes, validators |
| `persistence/` | Repository implementations |

```typescript
// src/infrastructure/persistence/InMemoryMatchRepository.ts
export class InMemoryMatchRepository implements MatchRepository {
  private matches = new Map<string, Match>();
  
  async save(match: Match): Promise<void> {
    this.matches.set(match.id, match);
  }
  
  async findById(id: string): Promise<Match | null> {
    return this.matches.get(id) ?? null```

Concrete;
  }
}
 implementations live here. The domain never imports them.

## Dependency Flow

```
┌──────────────────────────────────────────┐
│  HTTP Request → Route → Use Case → Repo │
└──────────────────────────────────────────┘
                    ↓
         Only depends on abstractions
                    ↓
  Use Case → MatchRepository (interface)  │
                    ↑                     │
  InMemoryMatchRepository (implements) ────┘
```

The `CreateMatchUseCase` only knows about `MatchRepository` interface. The actual `InMemoryMatchRepository` is injected from outside.

## Rule

**Inner layers never import outer layers.**

- Domain knows nothing
- Application knows Domain
- Infrastructure knows Domain (via interfaces)

This keeps business rules testable and independent of frameworks.

---

[← Back to Overview](./01-overview.md)
