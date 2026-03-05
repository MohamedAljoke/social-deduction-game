## Project Structure

```
src/
├── domain/                   # Core business logic (no external dependencies)
│   ├── entity/               # Match, Player, Template, Ability, Phase, Action, Vote
│   ├── errors.ts             # Domain-specific errors
│   └── ports/                # Repository interfaces (MatchRepository, TemplateRepository)
│
├── application/              # Use cases (orchestrate domain logic)
│   ├── container.ts          # Dependency injection container
│   └── usecases/             # CreateMatch, JoinMatch, StartMatch, SubmitAction, Vote, etc.
│
├── infrastructure/           # External adapters
│   ├── http/
│   │   ├── routes/           # HTTP route handlers
│   │   ├── validators/       # Zod schemas for request validation
│   │   ├── hono_adapter.ts   # Hono server adapter
│   │   └── express_adapter.ts # Express server adapter
│   │
│   └── persistence/           # Repository implementations
│       └── InMemoryMatchRepository.ts  # In-memory storage (easily swappable for PostgreSQL)
│
└── __test__/                 # Test files using Vitest
```

## Key Concepts

- **Zod DTOs** — All API input is validated at the http boundary using Zod schemas
- **DI Container** — A simple container manages dependencies, making it easy to swap implementations
- **In-Memory Database** — Default persistence layer; designed to be replaced with PostgreSQL or other databases
- **Entity Layer** — Domain entities contain pure business logic with no framework dependencies
- **Use Cases** — Application services orchestrate entities and repositories
- **Vitest** — Fast unit and integration testing

## Learning

See [docs/learn/](learn/) for deep dives into patterns and principles used in this project.
