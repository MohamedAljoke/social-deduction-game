# DDD Improvements — Remaining Tasks

## Completed

- [x] **Reduce Match Aggregate Responsibility** — Extracted 5 domain services (`TemplateAssignmentService`, `MatchVoting`, `AbilityActionFactory`, `WinConditionEvaluator`, `MatchSnapshotMapper`), built resolution pipeline (`ActionResolver` + 4 handlers), added collaborator tests (`match-collaborators.spec.ts`).

---

## Priority 1 — Aggregate Integrity

### Task 1: Protect Aggregate Encapsulation

**Problem:** Getters return mutable internal references; dead-code mutators bypass aggregate rules.

- `getPlayers()` / `getTemplates()` / `getActions()` return live `T[]` — callers can push/splice without aggregate consent.
- `setTemplates()` and `addAction()` are public but never called outside the aggregate — dead surface area that invites misuse.
- `Action.cancelled` is a public mutable field (`action.ts`).

**What to do:**
- [ ] Return `ReadonlyArray<T>` (or defensive copies) from all collection getters.
- [ ] Remove or make `setTemplates()` and `addAction()` private.
- [ ] Make `Action.cancelled` private with a `cancel()` method and `isCancelled` getter.

**DDD rationale:** Aggregate consistency boundary — all state changes must go through the root.

**Acceptance criteria:** No external code can mutate aggregate internals without calling a named domain method; compile-time enforcement via `ReadonlyArray`.

---

### Task 2: Model Phase Rules Inside the Phase Object

**Problem:** `Phase` is a passive state holder; callers check `isAction()` / `isVoting()` / `isResolution()` externally and throw `InvalidPhase` themselves.

- Phase checks are scattered across `Match.submitVote`, `Match.useAbility`, and use cases.
- `Phase` only exposes `currentPhase` value and `nextPhase()` transition.

**What to do:**
- [ ] Add guard methods to `Phase` (e.g. `assertCanVote()`, `assertCanUseAbility()`, `assertCanResolve()`).
- [ ] Move phase-specific validation into `Phase` so callers call one method instead of `if (!phase.isX()) throw`.
- [ ] Express transitions with named domain operations, not only `nextPhase()`.

**DDD rationale:** Rich value object / state model — lifecycle rules belong in the model that owns the lifecycle.

**Acceptance criteria:** No phase string-checks remain outside `Phase`; adding a new phase requires changes only in `Phase`.

---

### Task 3: Enforce Participation Invariants

**Problem:** `removePlayer()` has no lifecycle guard — leaving during a STARTED match creates orphan state (assigned template, pending votes/actions referencing a gone player).

- `LeaveMatchUseCase` checks player existence only, then removes unconditionally.

**What to do:**
- [ ] Define explicit policy: can a player leave during STARTED? If yes, handle cleanup (nullify votes, cancel actions). If no, reject with a domain error.
- [ ] Add lifecycle guard to `Match.removePlayer()` that enforces the chosen policy.
- [ ] Add tests for leave-during-each-phase scenarios.

**DDD rationale:** Explicit invariants — business rules must be intentional, not accidental.

**Acceptance criteria:** Leaving a match in any phase either succeeds with clean state or fails with a descriptive domain error; no orphan references.

---

## Priority 2 — Strategic Model Alignment

### Task 4: Decide Template Context Ownership

**Problem:** `TemplateRepository` and `InMemoryTemplateRepository` exist but are completely unused. `StartMatchUseCase` constructs templates directly from the request payload.

**What to do:**
- [ ] Choose: (A) templates are embedded runtime definitions within Match context — delete the unused repository and port; or (B) templates are a separate Rulebook context — wire the repository into `StartMatchUseCase`.
- [ ] Remove or integrate the dead code to match the decision.

**DDD rationale:** Bounded context clarity — mixed signals about ownership weaken the model's language.

**Acceptance criteria:** Zero unused template infrastructure remains; the chosen ownership model is documented and enforced.

---

### Task 5: Align Win-Condition Model With Runtime Behavior

**Problem:** `Template.winCondition` and `Template.endsGameOnWin` are declared but never read by `WinConditionEvaluator` — the evaluator hardcodes winner logic by alignment parity.

**What to do:**
- [ ] Either make `WinConditionEvaluator` read `winCondition` / `endsGameOnWin` to drive its logic, or remove these fields from `Template`.
- [ ] If kept, add tests proving the fields influence evaluation outcomes.

**DDD rationale:** High-fidelity domain model — model language must match executable behavior.

**Acceptance criteria:** Every `Template` field either participates in runtime logic or is removed.

---

### Task 6: Fix Domain Event Publishing Gap

**Problem:** All use cases manually call the publisher — but `UseAbilityUseCase` has **no publisher call at all** (confirmed bug). Additionally, events are implicit in use-case orchestration rather than raised by the domain.

**What to do:**
- [ ] Add event publishing to `UseAbilityUseCase` (bug fix).
- [ ] Consider raising domain events (`PlayerJoined`, `VoteSubmitted`, `MatchStarted`, `PhaseAdvanced`, `MatchEnded`) from the aggregate, published by the application layer.

**DDD rationale:** Explicit domain events make integration language reusable and auditable.

**Acceptance criteria:** Every state-changing use case publishes an event; `UseAbilityUseCase` notifies connected clients after ability use.

---

### Task 7: Make Error Codes Unique and Context-Specific

**Problem:** Three errors share the code `template_not_found` (`PlayerHasNoTemplate`, `MissingTemplate`, `TemplateNotFound`). `InvalidPhase` message is ability-specific but gets thrown for voting and resolution too.

**What to do:**
- [ ] Assign unique error codes to each error class (e.g. `player_has_no_template`, `missing_template`, `template_not_found`).
- [ ] Make `InvalidPhase` accept context (the operation attempted) so the message matches the violation.

**DDD rationale:** Ubiquitous language precision — distinct domain rules deserve distinct error identities.

**Acceptance criteria:** No two error classes share the same code; `InvalidPhase` messages reflect the actual failed operation.

---

## Priority 3 — Tactical Quality

### Task 8: Fix Repository Semantics

**Problem:** `InMemoryMatchRepository` stores and returns live object references — `findById` returns the same instance, so mutations bypass `save()`.

**What to do:**
- [ ] Clone (or snapshot/reconstitute) the aggregate on `save()` and `findById()` so the repository behaves like a real persistence boundary.

**DDD rationale:** Repository as aggregate boundary, not object cache — mutations must be explicit via `save()`.

**Acceptance criteria:** Modifying a returned aggregate does not affect the stored version until `save()` is called again.

---

### Task 9: Introduce Typed Domain Identifiers

**Problem:** All IDs (`matchId`, `playerId`, `templateId`) are plain `string` — nothing prevents passing a `playerId` where a `matchId` is expected.

**What to do:**
- [ ] Create branded types or value objects for `MatchId`, `PlayerId`, `TemplateId`.
- [ ] Update entity constructors and use-case signatures.

**DDD rationale:** Value objects and compile-time safety strengthen ubiquitous language.

**Acceptance criteria:** Swapping ID types causes a compile error.

---

### Task 10: Expand Architecture Fitness Functions

**Problem:** Only 1 fitness test exists ("domain must not import infrastructure"). No check for application depending on ports rather than concrete adapters.

**What to do:**
- [ ] Add fitness test: application layer imports only from `domain/` and `ports/`, never from `infrastructure/`.
- [ ] Add fitness test: infrastructure never imports from application (except through defined entry points).
- [ ] Consider adding a test that domain entities do not import from `node_modules` beyond allowed packages.

**DDD rationale:** Continuous boundary protection prevents architectural drift.

**Acceptance criteria:** At least 3 fitness tests covering domain, application, and infrastructure boundaries.

---

### Task 11: Make Domain Services Injectable

**Problem:** `Match` hardcodes 4 service instances via `new` in its constructor — tight coupling that prevents testing with stubs and violates dependency inversion.

**What to do:**
- [ ] Accept domain services as constructor parameters (or via a factory).
- [ ] Update `Match` creation sites to inject services.

**DDD rationale:** Dependency inversion — the aggregate should depend on abstractions, not concrete service instantiation.

**Acceptance criteria:** `Match` has zero `new DomainService()` calls; all services are injected.

---

### Task 12: Standardize Input Validation

**Problem:** Vote route has inline Zod validation; leave route uses raw `req.body as X` with no validation.

**What to do:**
- [ ] Apply consistent Zod schema validation to all routes that accept a body.
- [ ] Move schemas to a shared location or co-locate with route definitions.

**DDD rationale:** Validation consistency at the system boundary (anti-corruption layer).

**Acceptance criteria:** Every route with a request body validates via Zod before reaching the use case.

---

### Task 13: Break Circular Dependency (WebSocketManager)

**Problem:** `WebSocketManager` (infrastructure) imports `LeaveMatchUseCase` (application) — this is an infra-to-application dependency that inverts the allowed direction.

**What to do:**
- [ ] Inject a callback or port interface into `WebSocketManager` instead of importing the use case directly.
- [ ] Define a `DisconnectHandler` port in the application layer; implement it in infrastructure.

**DDD rationale:** Layered architecture — infrastructure must not depend on application.

**Acceptance criteria:** `WebSocketManager` has zero imports from `application/`; the fitness tests (Task 10) enforce this.

---

## Suggested Implementation Order

1. **Task 6** — Fix `UseAbilityUseCase` missing publisher (bug, quick win).
2. **Tasks 1-3** — Aggregate integrity (encapsulation, phase rules, participation).
3. **Tasks 4-5, 7** — Strategic alignment (template context, win-condition, error precision).
4. **Tasks 11, 13** — Dependency fixes (injectable services, circular dep).
5. **Tasks 8-10, 12** — Tactical quality (repository semantics, typed IDs, fitness tests, validation).
