# Dependency Injection

## What Is It?

Instead of creating dependencies inside a class, you receive them from outside. The class doesn't know or care HOW things are implemented - it just uses them.

```typescript
// ❌ Class creates its own dependency - hard to test
class CreateMatchUseCase {
  private repo = new InMemoryMatchRepository();
}

// ✅ Dependency is injected - flexible and testable
class CreateMatchUseCase {
  constructor(private readonly repo: MatchRepository) {}
}
```

## Why Use It?

| Benefit | Explanation |
|---------|-------------|
| **Testable** | Pass mock implementations |
| **Flexible** | Swap implementations without changing code |
| **Decoupled** | Classes don't know about each other |
| **Single Responsibility** | Class only does one thing, not create dependencies |

## In This Project

**Port (interface)** - `src/domain/ports/persistance/MatchRepository.ts`:
```typescript
export interface MatchRepository {
  save(match: Match): Promise<void>;
  findById(id: string): Promise<Match | null>;
  list(): Promise<Match[]>;
}
```

**Use case depends on port** - `src/application/CreateMatch.ts`:
```typescript
export class CreateMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}
  // Only knows about the interface, not implementation
}
```

**Container wires it up** - `src/container.ts`:
```typescript
container.register(
  TOKENS.MatchRepository,
  () => new InMemoryMatchRepository(),  // Concrete here
  { singleton: true },
);
container.register(
  TOKENS.CreateMatchUseCase,
  (c) => new CreateMatchUseCase(c.resolve(TOKENS.MatchRepository)),
);
```

## Testing Benefit

```typescript
// Pass a mock - no database needed!
const mockRepo = {
  save: vi.fn(),
  findById: vi.fn().mockResolvedValue(null),
  list: vi.fn().mockResolvedValue([]),
};

const useCase = new CreateMatchUseCase(mockRepo);
await useCase.execute({ name: "Test" });

expect(mockRepo.save).toHaveBeenCalled();
```

## Key Takeaway

The "D" in SOLID: **Depend on abstractions (interfaces), not concretions**. This project shows it via ports in `src/domain/ports/` and the container in `src/container.ts`.

---

[← Back to Overview](./01-overview.md)
