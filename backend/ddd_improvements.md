# DDD Improvements (Current Backend)

## Scope
This document analyzes only the backend code that already exists.
It does not evaluate planned ability-system refactors.

## Current Domain Snapshot
- The backend already follows a layered structure (domain, application, infrastructure) and enforces one important dependency rule in tests.
- The `Match` model is the main aggregate root and currently concentrates many behaviors: player membership, template assignment, voting, phase progression, action queueing, and winner evaluation.
- Use cases orchestrate persistence and realtime notifications in a clear flow.

## Priority 1: High Learning Value

### 1) Protect Aggregate Encapsulation
What we improve:
- Prevent external code from mutating aggregate internals directly.
- Return read-only snapshots or query methods instead of raw mutable arrays and entities.

Why we improve this:
- In DDD, aggregate invariants must be protected by the aggregate root.
- Right now invariants can be bypassed because mutable internals are exposed.

Evidence in current code:
- `getPlayers()` returns `Player[]` directly: [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L102)
- `getTemplates()` returns `Template[]` directly: [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L106)
- `getActions()` returns `Action[]` directly: [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L213)
- `addAction()` is public, allowing bypass of `useAbility`: [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L217)
- `Action.cancelled` is public mutable state: [action.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/action.ts#L50)

DDD concept strengthened:
- Aggregate consistency boundary.

### 2) Reduce `Match` Aggregate Responsibility Overload
What we improve:
- Keep `Match` as root, but extract domain policies/services for role assignment, voting result calculation, and win-condition evaluation.

Why we improve this:
- A single model with too many responsibilities becomes hard to reason about.
- Splitting policies makes invariants explicit and easier to test in isolation.

Evidence in current code:
- Template assignment and randomization: [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L118)
- Voting tally and elimination logic: [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L172)
- Winner evaluation logic: [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L321)

DDD concept strengthened:
- Clear aggregate model + domain services for cross-entity policy logic.

### 3) Model Phase Rules Inside the Phase Model
What we improve:
- Move "what is allowed in each phase" into the `Phase` model instead of string checks spread across `Match`.
- Express transitions with named domain operations, not only `nextPhase()`.

Why we improve this:
- Ubiquitous language improves when phase rules live in one place.
- Prevents rule duplication and inconsistent validations.

Evidence in current code:
- `Phase` currently holds only current value and next transition: [phase.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/phase.ts#L10)
- Phase checks are distributed in `submitVote` and `useAbility`: [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L154), [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L221)

DDD concept strengthened:
- Rich value object/state model around lifecycle rules.

### 4) Clarify and Enforce Participation Invariants
What we improve:
- Define explicit policy for when a player can leave a match.
- Ensure removal behavior matches game lifecycle rules.

Why we improve this:
- DDD requires business rules to be explicit, not accidental.
- Current behavior can create ambiguous domain states if leaving is always allowed.

Evidence in current code:
- `removePlayer` has no lifecycle guard: [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L146)
- `LeaveMatchUseCase` checks existence only, then removes: [LeaveMatch.ts](/home/mohamed/project/social-deduction-game/backend/src/application/LeaveMatch.ts#L216)

DDD concept strengthened:
- Explicit invariants and consistency rules.

## Priority 2: Strategic DDD Clarity

### 5) Decide Bounded Context Ownership for Templates
What we improve:
- Make a clear strategic decision:
- Option A: templates belong fully to Match context and are embedded runtime definitions.
- Option B: templates belong to a separate Rulebook context and are referenced by identity.

Why we improve this:
- The code currently mixes both signals, which weakens boundary language.

Evidence in current code:
- `TemplateRepository` exists but is unused: [TemplateRepository.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/ports/persistance/TemplateRepository.ts#L3), [InMemoryTemplateRepository.ts](/home/mohamed/project/social-deduction-game/backend/src/infrastructure/persistence/InMemoryTemplateRepository.ts#L4)
- `StartMatchUseCase` constructs templates directly from request: [StartMatch.ts](/home/mohamed/project/social-deduction-game/backend/src/application/StartMatch.ts#L34)

DDD concept strengthened:
- Strategic design and bounded context clarity.

### 6) Align Win-Condition Model With Runtime Behavior
What we improve:
- Align `Template.winCondition` and `endsGameOnWin` with actual winner evaluation flow.
- Either make them operational domain rules or keep winner logic centrally in one policy and remove unused language.

Why we improve this:
- In DDD, model language should match executable behavior.
- Unused domain concepts create false ubiquitous language.

Evidence in current code:
- Template has `winCondition` and `endsGameOnWin`: [template.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/template.ts#L74)
- Winner logic is hardcoded by alignment parity: [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L321)

DDD concept strengthened:
- High-fidelity domain model.

### 7) Introduce Domain Events as Core Language
What we improve:
- Raise events from domain actions (for example: `PlayerJoined`, `VoteSubmitted`, `MatchStarted`, `PhaseAdvanced`, `MatchEnded`) and publish from application layer.

Why we improve this:
- Today orchestration is correct, but event intent is implicit in use-case code.
- Domain events make integration language explicit and reusable.

Evidence in current code:
- Use cases manually call publisher after each operation: [JoinMatch.ts](/home/mohamed/project/social-deduction-game/backend/src/application/JoinMatch.ts#L191), [AdvancePhase.ts](/home/mohamed/project/social-deduction-game/backend/src/application/AdvancePhase.ts#L126), [SubmitVote.ts](/home/mohamed/project/social-deduction-game/backend/src/application/SubmitVote.ts#L160)

DDD concept strengthened:
- Explicit domain events and context mapping.

### 8) Make Error Language Context-Specific and Unique
What we improve:
- Keep each error code semantically unique.
- Use error messages that match the exact rule being violated.

Why we improve this:
- Shared or ambiguous codes hide important domain distinctions.
- Precise language is central to ubiquitous language and diagnostics.

Evidence in current code:
- `InvalidPhase` message is ability-specific, but phase validation is reused for voting: [errors.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/errors.ts#L95), [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L154)
- `PlayerHasNoTemplate` uses `template_not_found` code: [errors.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/errors.ts#L59)
- `MissingTemplate` and `TemplateNotFound` overlap conceptually: [errors.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/errors.ts#L37), [errors.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/errors.ts#L53)

DDD concept strengthened:
- Ubiquitous language precision.

## Priority 3: Tactical Quality That Supports DDD

### 9) Define Repository Semantics as Aggregate Persistence
What we improve:
- Make repository behavior explicit: persist/reconstitute aggregate state instead of sharing live in-memory object references.

Why we improve this:
- Shared references can hide lifecycle bugs and produce unrealistic persistence behavior.
- Better persistence semantics improve aggregate tests and domain confidence.

Evidence in current code:
- `InMemoryMatchRepository` stores and returns direct aggregate object references: [InMemoryMatchRepository.ts](/home/mohamed/project/social-deduction-game/backend/src/infrastructure/persistence/InMemoryMatchRepository.ts#L4)

DDD concept strengthened:
- Repository as aggregate boundary, not object cache.

### 10) Use Typed Domain Identifiers
What we improve:
- Introduce typed IDs/value objects for `MatchId`, `PlayerId`, `TemplateId`.

Why we improve this:
- Plain `string` IDs allow accidental cross-usage and weaken model clarity.
- Typed IDs improve language safety at compile time.

Evidence in current code:
- IDs are plain strings across entities and use cases: [match.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/match.ts#L58), [player.ts](/home/mohamed/project/social-deduction-game/backend/src/domain/entity/player.ts#L95), [StartMatch.ts](/home/mohamed/project/social-deduction-game/backend/src/application/StartMatch.ts#L13)

DDD concept strengthened:
- Value objects and stronger ubiquitous language.

### 11) Expand Architecture Fitness Functions
What we improve:
- Add tests for additional dependency rules, not only "domain must not import infrastructure".
- Add checks for application depending on ports/contracts rather than concrete adapters.

Why we improve this:
- Architectural drift is common in growing projects.
- Fitness functions turn intended boundaries into executable constraints.

Evidence in current code:
- Current architecture test validates only one rule: [architecture-fitness.spec.ts](/home/mohamed/project/social-deduction-game/backend/src/__test__/fitness-functions/architecture-fitness.spec.ts#L21)

DDD concept strengthened:
- Continuous boundary protection.

## Suggested Implementation Order
1. Encapsulation and aggregate boundary hardening.
2. Phase and participation invariants.
3. Strategic template context decision.
4. Win-condition model alignment and domain events.
5. Repository semantics, typed IDs, and fitness-function expansion.

## Expected Learning Outcomes
- Better understanding of aggregate boundaries and invariant protection.
- Clearer distinction between strategic design (bounded contexts) and tactical patterns (entities, value objects, repositories, domain events).
- Stronger ubiquitous language, where model terms and runtime behavior stay aligned.
