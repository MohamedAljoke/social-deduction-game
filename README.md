# Social Deduction Game

A real-time multiplayer social deduction game built with:

- TypeScript
- Clean Architecture (DDD-inspired backend)
- WebSockets for real-time gameplay
- Feature-oriented frontend structure

---

## Quick Navigation

| What you need                        | Where to look                                                                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Backend architecture & key files     | [`backend/README.md`](backend/README.md)                                                                   |
| Frontend architecture & WS lifecycle | [`client/README.md`](client/README.md)                                                                     |
| WebSocket event contracts            | [`docs/implementation-spec/websocket/README.md`](docs/implementation-spec/websocket/README.md)             |
| Ability system design & steps        | [`docs/implementation-spec/ability/README.md`](docs/implementation-spec/ability/README.md)                 |
| Frontend screen/flow design          | [`docs/implementation-spec/front/front.md`](docs/implementation-spec/front/front.md)                       |
| Frontend React component plan        | [`docs/implementation-spec/front/react-components.md`](docs/implementation-spec/front/react-components.md) |

---

## Monorepo Structure

```
social-deduction-game/
├── backend/     # DDD-based API + WebSocket server (port 3000)
├── client/      # React frontend (Vite)
├── docs/
│   └── implementation-spec/
│       ├── ability/    # Ability resolver — step-by-step specs (steps 01–11)
│       ├── front/      # Frontend screen flow & component plan
│       └── websocket/  # WS event contracts & architecture
└── package.json
```

### Key Source Files

**Backend**

| File                                              | Purpose                                                       |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `backend/src/domain/entity/match.ts`              | Core Match aggregate                                          |
| `backend/src/application/`                        | Use cases (StartMatch, UseAbility, AdvancePhase, LeaveMatch…) |
| `backend/src/infrastructure/websocket/mod.ts`     | WebSocket server & room management                            |
| `backend/src/infrastructure/http/routes/match.ts` | REST routes                                                   |
| `backend/src/container.ts`                        | Dependency injection wiring                                   |

**Frontend**

| File                                          | Purpose                               |
| --------------------------------------------- | ------------------------------------- |
| `client/src/context/GameContext.tsx`          | React context + reducer + Provider    |
| `client/src/context/GameSessionService.ts`    | Orchestrates gateway + API + dispatch |
| `client/src/infrastructure/ws/GameGateway.ts` | Domain-aware WebSocket bridge         |
| `client/src/infrastructure/http/ApiClient.ts` | Typed REST client                     |
| `client/src/types/events.ts`                  | ClientEvent / ServerEvent union types |

---

## Development

```bash
# Install all dependencies
npm install
npm run dev:client-install
npm run dev:server-install

# Run both servers (concurrently)
npm run dev
```

Backend runs on `http://localhost:3000` / `ws://localhost:3000/ws`.

---

## Testing

```bash
npm run dev:server-test   # Backend (Vitest)
npm run dev:client-test   # Frontend (Playwright e2e)
```

### E2E scenario flag

- `ENABLE_ABILITIES_IN_REAL_SCENARIO` in `client/src/test/e2e/real-game-scenario.spec.ts` is currently `false`.
- This keeps the 8-player full-flow e2e scenario focused on join/phase/voting/end-game without action abilities.
- Flip it to `true` when extending that scenario to include ability usage assertions.

---

## Architecture at a Glance

```
Frontend                          Backend
────────────────────────────────────────────────────
features/ (UI)                    infrastructure/http  (REST)
  └── hooks → GameSessionService ──→ application/ (use cases)
                 ↕                       └── domain/ (Match, Player…)
            GameGateway ←──────────── infrastructure/websocket
            (WS events)               (broadcasts domain events)
```

- REST for match creation and commands (start, ability, phase)
- WebSocket for real-time domain events pushed to all room members
- Backend is authoritative — frontend renders state received from server

---

## Active Implementation: Ability Resolver (`feat/ability-resolver`)

The current branch is building the full ability resolution pipeline.
See [`docs/implementation-spec/ability/`](docs/implementation-spec/ability/) for the step-by-step plan.

Resolution pipeline: `Action → ActionResolver → [KillHandler | ProtectHandler | RoleblockHandler | InvestigateHandler] → Commit`

---

## Project Goals

- Clean separation of concerns
- Highly testable architecture
- Scalable real-time engine
- Easy migration to PostgreSQL
- Easily extendable ability system

## E2E test errors

if an error happens you can find the error context in /client/test-results/error-context.md
