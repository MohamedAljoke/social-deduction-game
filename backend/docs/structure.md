## Project Structure

```
src/
├── domain/                         # Core business logic (no external dependencies)
│   ├── entity/                     # Match, Player, Template, Ability, Phase, Action
│   ├── events/
│   │   └── match-events.ts         # Domain events (PlayerJoined, PhaseAdvanced, MatchEnded, MatchRematched…)
│   ├── errors.ts                   # Domain-specific errors
│   ├── ports/
│   │   ├── RealtimePublisher.ts    # Port: broadcast events to clients
│   │   └── persistance/            # MatchRepository, TemplateRepository interfaces
│   └── services/
│       ├── match/                  # MatchVoting, WinConditionEvaluator, TemplateAssignmentService, MatchSnapshotMapper
│       └── resolution/             # ActionResolver + effect handlers (Kill, Protect, RoleBlock, Investigate, VoteShield)
│
├── application/                    # Use cases (orchestrate domain logic)
│   ├── CreateMatch.ts
│   ├── ListMatchs.ts
│   ├── GetMatch.ts
│   ├── JoinMatch.ts
│   ├── LeaveMatch.ts
│   ├── StartMatch.ts               # Assigns templates, starts match, triggers AI narration
│   ├── AdvancePhase.ts             # Cycles phase, resolves actions on resolution, triggers AI narration
│   ├── UseAbility.ts
│   ├── SubmitVote.ts
│   ├── RematchMatch.ts             # Resets a FINISHED match back to LOBBY
│   ├── publishMatchEvents.ts       # Broadcasts domain events via RealtimePublisher
│   └── ai/
│       ├── AiNarrator.ts           # Port: AiNarrator interface + NarrationResult type
│       ├── NarrationContextBuilder.ts  # Builds rich context from match snapshot for AI
│       ├── PublicNarrationEvent.ts # Mapper: domain events → public narration event types
│       └── publishMatchNarration.ts    # Orchestrates narration pipeline (context → AI → fallback → publish)
│
├── infrastructure/                 # External adapters
│   ├── ai/
│   │   ├── GeminiAiNarrator.ts     # Google Gemini AI provider
│   │   ├── OpenRouterAiNarrator.ts # OpenRouter AI provider
│   │   ├── FailoverAiNarrator.ts   # Tries primary, falls back to secondary
│   │   ├── NoopAiNarrator.ts       # No-op (disabled narrator)
│   │   └── createAiNarratorFromEnv.ts  # Factory: picks narrator from env config
│   ├── http/
│   │   ├── routes/match.ts         # HTTP route handlers
│   │   ├── validators/match.ts     # Zod schemas for request validation
│   │   ├── hono_adapter.ts         # Hono server adapter
│   │   └── express_adapter.ts      # Express server adapter
│   ├── persistence/
│   │   ├── InMemoryMatchRepository.ts      # In-memory storage (swappable for PostgreSQL)
│   │   └── InMemoryTemplateRepository.ts
│   └── websocket/
│       ├── mod.ts                  # WebSocket server & room management
│       └── WebSocketPublisher.ts   # RealtimePublisher implementation over WS
│
├── container.ts                    # Dependency injection wiring
└── __test__/                       # Test files using Vitest
    ├── application/ai/             # Narration pipeline unit tests
    ├── domain/                     # Domain logic unit tests
    ├── infrastructure/ai/          # AI narrator adapter tests
    ├── infrastructure/websocket/   # WS publisher tests
    └── end-to-end/                 # Match & WebSocket e2e tests
```

## Key Concepts

- **Zod DTOs** — All API input is validated at the HTTP boundary using Zod schemas
- **DI Container** — `container.ts` wires all dependencies; swap implementations without touching business logic
- **In-Memory Database** — Default persistence layer; designed to be replaced with PostgreSQL
- **Entity Layer** — Domain entities contain pure business logic with zero framework dependencies
- **Use Cases** — Application services orchestrate entities and repositories
- **Domain Events** — Entities emit events (`pullEvents()`); use cases broadcast them via `RealtimePublisher`
- **AI Narrator** — Optional feature (`aiGameMasterEnabled` config); generates Portuguese narration for key game moments with automatic provider failover
- **Match Rematch** — Finished matches can be reset to LOBBY, preserving players and template setup
- **Action Resolution** — Abilities resolve in priority stages: defensive → cancellation → offensive → read
- **Vitest** — Fast unit and integration testing

## Learning

See [docs/learn/](learn/) for deep dives into patterns and principles used in this project.
