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
