# SOLID Principles

Five guidelines for maintainable code.

## S - Single Responsibility

**Each class does one thing.**

| In This Project | Responsibility |
|-----------------|----------------|
| `Match` | Game logic only |
| `CreateMatchUseCase` | Orchestrates match creation |
| `InMemoryMatchRepository` | Data storage only |

Classes in `src/domain/entity/` have no imports from infrastructure - pure domain logic.

## O - Open/Closed

**Open for extension, closed for modification.**

Add new abilities without changing existing code:

```typescript
// src/domain/entity/ability.ts
export type AbilityId = "kill" | "protect" | "roleblock" | "investigate";
```

New ability? Add to type + create handler. Old code untouched.

## L - Liskov Substitution

**Subtypes can replace their parents.**

```typescript
// Any implementation works
async function createMatch(repo: MatchRepository) {
  await repo.save(match);
}
```

`InMemoryMatchRepository` can swap with `PostgresMatchRepository` - interface doesn't change.

## I - Interface Segregation

**Small, focused interfaces > one big interface.**

```typescript
// src/domain/ports/persistance/MatchRepository.ts
export interface MatchRepository {
  save(match: Match): Promise<void>;
  findById(id: string): Promise<Match | null>;
  list(): Promise<Match[]>;
}

// Separate port in src/domain/ports/persistance/TemplateRepository.ts
export interface TemplateRepository {
  findById(id: string): Promise<Template | null>;
}
```

Use cases only depend on what they need.

## D - Dependency Inversion

**Depend on abstractions, not concretions.**

```typescript
// src/application/CreateMatch.ts
export class CreateMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}
  //                       ^ Interface, not class!
}
```

The `MatchRepository` interface lives in domain. Concrete `InMemoryMatchRepository` is only in infrastructure.

## Summary

| Principle | This Project |
|-----------|---------------|
| SRP | Domain has no infrastructure imports |
| OCP | Ability types are extensible |
| LSP | Any repo implementation works |
| ISP | Separate ports for Match, Template |
| DIP | Use cases depend on interfaces |

---

[← Back to Overview](./01-overview.md)
