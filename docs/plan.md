## Social Deduction Game – Development Plan

### 0. Library & Integration Goals
- **HTTP-agnostic core**: Keep `domain` and `application` layers free of HTTP/web concerns so they can be published and reused as a standalone library (e.g. in an Among Us–style game).
- **Ports & adapters only at the edges**: All framework-specific code (Express, Hono, WebSocket, etc.) must live in `infrastructure`, depending only on ports/use cases.
- **Composable API**: Expose use cases and aggregates in a way that another project can:
  - Instantiate repositories/adapters.
  - Wire use cases into its own HTTP or realtime transport.
  - Drive the game loop (phases, actions, resolution) programmatically.

### 1. Domain Modelling
- **Aggregates**
  - **Template (Role) Aggregate – per-player role**
    - `Template` (alignment, winCondition, endsGameOnWin)
    - `Ability` (kill, protect, roleblock, investigate, etc.)
  - **Match Aggregate – game instance**
    - `Match` (id, name, status, createdAt)
    - `Player` (id, name, status, `templateId?` pointing to a role)
    - `Phase` (discussion → voting → action → resolution loop)
    - `Action` (actorId, abilityId, targetIds, cancelled)
- **Rules to formalize**
  - Minimum players, template/player count matching
  - Which abilities can be used in which phase
  - Targeting rules (self-target, alive-only, etc.)
  - Win conditions (default, vote_eliminated, template-specific)

### 2. Core Use Cases (Application Layer)
- **Match management**
  - **CreateMatchUseCase**
    - Input: match name/metadata.
    - Behavior: create `Match` in `LOBBY` status; no templates/roles assigned yet.
  - **ListMatchesUseCase**
    - Input: optional filters (status, etc. – future).
    - Behavior: return matches as lightweight DTOs.
  - **GetMatchUseCase** (future)
    - Input: `matchId`.
    - Behavior: return a full `Match` view (players, phase, actions) for clients.

- **Lobby & players**
  - **JoinMatchUseCase**
    - Input: `matchId`, player name/id.
    - Behavior: request to add `Player` to `Match` while in `LOBBY`; the `Match` aggregate (`addPlayer`) enforces that players can only be added when status is `LOBBY`, plus any uniqueness/capacity rules.
  - **LeaveMatchUseCase** (optional)
    - Input: `matchId`, player id.
    - Behavior: remove player or mark as left before match start.

- **Game lifecycle**
  - **StartMatchUseCase**
    - Input: `matchId`, plus a list of per-player `templates` for this match (alignment + abilities).
    - Behavior: validate minimum player count; validate that the number of templates matches the number of players; create `Template` value objects inside the `Match` aggregate (templates live inside a match, not as a separate aggregate), randomly assign one template to each player (so team and abilities are known before the game actually runs), store the templates on the `Match`, and set the initial `Phase`.
  - **AdvancePhaseUseCase**
    - Input: `matchId`.
    - Behavior: move `Phase` along the configured order, trigger resolution when entering/leaving particular phases, stop when match is `FINISHED`.
  - **CheckWinConditionsUseCase**
    - Input: `matchId`.
    - Behavior: evaluate template and global win conditions; set `MatchStatus.FINISHED` when met.

- **Actions & abilities**
  - **QueueActionUseCase**
    - Input: `matchId`, `actorId`, `abilityId`, `targetIds`.
    - Behavior: validate actor is alive and owns the ability, validate targets per ability rules, append an `Action` to the current phase.
  - **ResolveActionsUseCase**
    - Input: `matchId`, phase context (e.g., night/day).
    - Behavior: resolve queued actions in a deterministic order (e.g., protect before kill), handle cancellations/blocks, update `Player` states.
  - **ListActionsUseCase** (optional)
    - Input: `matchId`, filters by phase/round.
    - Behavior: return action history for logs or replays.

### 3. Ports & Infrastructure
- **Ports (already following Hexagonal)**
  - `MatchRepository` (save, findById, list, delete)
  - `TemplateRepository` (save, findById, findByIds, findAll)
- **Adapters**
  - In-memory repositories for `Match` and `Template`
  - HTTP routes:
    - `POST /match` – create match
    - `GET /match` – list matches
    - (Future) `POST /match/:id/join`, `POST /match/:id/start`
    - (Future) `POST /match/:id/action`, `POST /match/:id/advance-phase`
  - Later: WebSocket adapter for real-time updates

### 4. Gameplay Flow (Happy Path v1)
1. Templates and abilities are predefined in memory.
2. Client creates a match (optionally selecting a template set).
3. Players join the lobby and are bound to templates/roles.
4. Owner starts the match:
   - Validate player count vs templates.
   - Initialize `Phase` to `discussion`.
5. Loop phases:
   - **Discussion**: no server-side logic yet, just state.
   - **Voting**: accept votes, determine elimination target.
   - **Action**: accept ability actions, queue them.
   - **Resolution**: resolve queued actions, update player status, check win conditions.
6. When a win condition is met, set match status to `FINISHED`.

### 5. Incremental Milestones
- **M1 – Current**
  - Basic aggregates wired (`Template`, `Ability`, `Match`, `Player`, `Phase`, `Action`).
  - Create and list matches via HTTP.
- **M2 – Lobby & Join**
  - Implement join match use case and route.
  - Enforce `MatchStatus.LOBBY` for joining.
- **M3 – Start Match & Phase Loop**
  - Implement start match (with template assignment and validation).
  - Implement advance phase logic on `Match`.
  - Expose `advance-phase` endpoint.
- **M4 – Actions & Resolution**
  - Implement queue action use case with domain validations.
  - Implement resolution engine for a small subset of abilities (kill/protect).
  - Add minimal tests for action outcomes.
- **M5 – Win Conditions & Polishing**
  - Implement template-based win conditions.
  - Add more abilities and edge-case rules.
  - Improve HTTP contract, error handling, and tests.

### 6. Testing Strategy
- **Unit tests** for domain entities and use cases (no HTTP).
- **Fitness functions** to enforce architecture boundaries (already started).
- **End-to-end tests** hitting HTTP routes for main flows:
  - Create/list match.
  - Join/start/advance-phase.
  - Queue/resolve actions and verify outcomes.

### 7. Next Concrete Steps
1. Add `JoinMatchUseCase` and `POST /match/:id/join` route.
2. Add `StartMatchUseCase` with template/player validation.
3. Extend `Match` aggregate with minimal phase round information if needed (e.g., day/night counter).
4. Implement first ability resolution pass (kill + protect) in the resolution phase.

