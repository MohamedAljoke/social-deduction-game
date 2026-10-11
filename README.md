# Social Deduction Game

A real-time multiplayer game (think *Mafia* / *Werewolf*), built as a study in **Domain-Driven Design and SOLID** in TypeScript.

**[Play the live demo](https://social-deduction-game-tvek.onrender.com/)** · [Project board](https://github.com/users/MohamedAljoke/projects/2)

Players join a lobby, receive secret roles, and cycle through **discussion → voting → action → resolution** until one side wins. Roles have abilities (kill, protect, roleblock, investigate, vote shield) that resolve by priority each round.

The gameplay is the excuse. The point is the backend design.

## What this project demonstrates

**Rich domain model, not anemic data bags**
- `Match` is the aggregate root. It owns players, phases, votes and actions, and every state change goes through its methods (`addPlayer`, `submitVote`, `useAbility`, `advancePhase`, `rematch`).
- Invariants live in the domain: you can't join a started match, vote outside the voting phase, or use an ability while dead. Breaking a rule throws a typed domain error.
- Small entities and value objects (`Player`, `Phase`, `Ability`, `Template`) guard their own state.

**Domain events**
- The aggregate records events (`PlayerJoined`, `VoteSubmitted`, `ActionsResolved`, `MatchEnded`, ...). Use cases pull them after saving and publish them over WebSockets, so the domain never knows about transport.

**SOLID where it pays off**
- *Open/closed:* each ability is an `EffectHandler` registered in an `ActionResolver`. A new ability is a new class, not a new `if`.
- *Single responsibility:* voting, win conditions, role assignment and snapshots are separate domain services the aggregate delegates to.
- *Dependency inversion:* inner layers define ports (`MatchRepository`, `RealtimePublisher`, `AiNarrator`) and infrastructure implements them. Even the web framework is swappable: Express and Hono adapters implement the same `HttpServer` interface.

**Architecture enforced by tests**
- Fitness-function tests fail the build if `domain/` imports from `infrastructure/`.
- Domain unit tests, WebSocket and HTTP end-to-end tests (Vitest), browser E2E tests (Playwright), all run in CI.

**Optional AI game master**
- Narrates game events through Gemini or OpenRouter, with failover between providers and a no-op fallback, all behind the `AiNarrator` port. Toggled per match.

## Architecture

```
backend/src/
├── domain/           # entities, value objects, domain services, events, ports (no framework imports)
│   ├── entity/       # Match (aggregate root), Player, Phase, Ability, Template
│   ├── services/     # voting, win conditions, ability resolution (one handler per effect)
│   ├── events/       # domain events raised by the aggregate
│   └── ports/        # repository and publisher interfaces
├── application/      # one use case per action: CreateMatch, JoinMatch, SubmitVote, UseAbility, ...
└── infrastructure/   # Express/Hono HTTP, WebSocket publisher, in-memory repositories, AI providers
client/               # React + Vite frontend, WebSocket gateway
shared/               # ability definitions shared by backend and client
```

A request flows one way: **HTTP route → use case → aggregate method → repository save → pull domain events → WebSocket publish**.

## Tech stack

**Backend:** TypeScript, Node.js, Express / Hono, WebSockets (`ws`), Zod, Vitest
**Frontend:** React 19, Vite, Tailwind CSS, Playwright
**AI:** Gemini, OpenRouter

## Run it locally

```sh
npm run install:all
npm run dev            # backend on :3000 (ws://localhost:3000/ws), client via Vite
```

```sh
npm run test --prefix backend -- --run   # backend unit, e2e and architecture tests
npm run test:e2e --prefix client         # browser E2E
```

For the AI narrator, set `GEMINI_API_KEY` and/or `OPENROUTER_API_KEY` (optionally `AI_PROVIDER=gemini|openrouter` to pick the preferred one).

## Author

**Mohamed Aljoke**, backend engineer · [Portfolio](https://mohamedaljoke.github.io/cv/) · [Blog](https://devmohami.hashnode.dev/)
