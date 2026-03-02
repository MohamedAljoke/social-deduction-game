# Dependency Injection

## What Is It?

**Receiving dependencies as parameters** instead of creating them inside the class.

```typescript
// ❌ Creates its own dependency - tight coupling
class CreateMatchUseCase {
  private repo = new InMemoryMatchRepository();
}

// ✅ Receives dependency - loose coupling
class CreateMatchUseCase {
  constructor(private readonly repo: InMemoryMatchRepository) {}
}
```

## Why Use It?

| Benefit                   | Explanation                                   |
| ------------------------- | --------------------------------------------- |
| **Testable**              | Pass mock implementations                     |
| **Flexible**              | Swap implementations without changing code    |
| **Single Responsibility** | Class focuses on its job, not creating things |

## Injection vs Inversion

These are often confused but are different:

| Concept                  | What It Is                                                    |
| ------------------------ | ------------------------------------------------------------- |
| **Dependency Injection** | Technique: someone CALLS your class and passes the dependency |
| **Dependency Inversion** | Principle: depend on ABSTRACTION (interface), not concretion  |

### Dependency Injection (Technique)

**Someone calls your class** and passes the dependency in:

```typescript
// You write this - receives dependency
class CreateMatchUseCase {
  constructor(private repo: InMemoryMatchRepository) {}
}

// Caller does this - provides the instance
const repo = new InMemoryMatchRepository(); // caller creates
const useCase = new CreateMatchUseCase(repo); // caller passes
```

**Key:** The dependency comes from outside. But could still be a concrete class.

### Dependency Inversion (Principle)

Your class depends on an **abstraction** (interface), not a concrete class:

```typescript
// Interface - abstraction in domain layer
interface IMatchRepository {
  save(match: Match): Promise<void>;
}

class InMemoryMatchRepository implements IMatchRepository {}

// Use case depends on INTERFACE, not class
class CreateMatchUseCase {
  constructor(private repo: IMatchRepository) {} // not InMemoryMatchRepository!
}
```

**Key:** High-level (`UseCase`) and low-level (`InMemoryMatchRepository`) both depend on the **same interface**.

### Putting It Together

```typescript
// Step 1: Define abstraction (interface)
interface IMatchRepository {}

// Step 2: Use case depends on abstraction
class CreateMatchUseCase {
  constructor(private repo: IMatchRepository) {}
}

class InMemoryMatchRepository implements MatchRepository {}
// Step 3: Caller wires it up (creates + passes)
const repo = new InMemoryMatchRepository();
const useCase = new CreateMatchUseCase(repo);
```

**Injection** = passing things in (the mechanism).  
**Inversion** = depending on abstractions (the principle).

---

## Constructor Injection

Most common form - pass via constructor:

```typescript
export class CreateMatchUseCase {
  constructor(private readonly repository: IMatchRepository) {}

  async execute(input: { name?: string }) {
    const match = Match.create(input.name ?? "match_one");
    await this.repository.save(match);
    return match.toJSON();
  }
}
```

## Setter Injection

Alternative - inject via setter:

```typescript
class UseCase {
  private repository: MatchRepository;

  setRepository(repo: MatchRepository) {
    this.repository = repo;
  }
}
```

## In This Project

Use cases use constructor injection:

```typescript
// src/application/CreateMatch.ts
export class CreateMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}
}

// src/application/JoinMatch.ts
export class JoinMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly templateRepository: TemplateRepository,
  ) {}
}
```

The **interface** (`MatchRepository`) lives in domain. The **implementation** (`InMemoryMatchRepository`) lives in infrastructure.

## Testing Benefit

```typescript
const mockRepo = {
  save: vi.fn(),
  findById: vi.fn().mockResolvedValue(null),
};

const useCaseUseCase(mockRepo = new CreateMatch);
// Test without any database!
```

---

[← Back to Overview](./01-overview.md)
