# Plan: Voting Pipeline & Tally Resolution

## Goal

Provide a voting subsystem that fits into the existing phase flow so players can cast votes during the `voting` phase, ties can be resolved, and vote-driven eliminations feed back into the phased resolution model (particularly for templates whose `winCondition` is `vote_eliminated`).

## Principles

- **Domain-first votes**: Votes should be tracked in the domain layer with clear semantics (`voterId`, `targetId`, `round`). They must not depend on transport logic.
- **Phase-aware**: Votes can only be cast during `voting`; other phases ignore them. Vote results should feed into the match lifecycle once voting closes.
- **Deterministic resolution**: Tallying must be transparent (e.g., highest votes loses, tie-handling policy defined).
- **Extensible commits**: Final state changes happen in the commit phase alongside ability resolution (elimination, status updates).

## Step 1: Introduce Vote Domain Model

- Create a `Vote` entity (or simple structure) inside `src/domain/entity` capturing `voterId`, `targetId`, `timestamp`, and `round`/phase identifier.
- Add helpers (e.g., `VoteSummary`, `VoteResult`) to describe tally output (`candidateId`, `count`, `resultType`).
- Ensure votes are immutable once recorded.

## Step 2: Match Vote Tracking

- Extend `Match` with vote-related state (`currentVotes: Vote[]`, `voteHistory: VoteResult[]`).
- Add `castVote(voterId, targetId)`:
  - Validate match is `STARTED`, phase is `voting`, both players alive, voter only votes once per round.
  - Store vote and update helper indexes (e.g., `Map<targetId, Vote[]>`).
- Add `tallyVotes()` invoked when voting phase ends:
  - Group votes by `targetId`, count.
  - Detect highest vote-getter(s).
  - Define tie policy (no elimination, or random if future requirement).
  - Record a `VoteResult` (includes metadata for audit and API response).
  - Queue pending elimination state change(s) for commit.
- Clear votes after tally so next round starts clean.

## Step 3: Tying Votes into Phase Transitions

- Update `AdvancePhaseUseCase`:
  - When advancing from `voting` to `action`, call `match.tallyVotes()` to compute results.
  - Include vote results in response payload (e.g., `voteResolution`).
  - Keep vote results stored for API/state querying (match `toJSON` should surface last vote summary).
- Ensure `match.resolveActions()` and vote tallying share the same commit semantics so eliminations happen before next phase.

## Step 4: Voting Use Case & API

- Create `CastVoteUseCase` (or expand existing use cases):
  - Input: `matchId`, `voterId`, `targetId`.
  - Output: `MatchResponse` plus latest vote tally or status.
- Add HTTP validator (e.g., `CastVoteSchema`) and route `POST /match/:matchId/vote`.
- Hook into container/DI so the new use case is available to adapters.

## Step 5: Persistence & Serialization Updates

- Update `Match.toJSON()` to include:
  - Current vote counts (if `voting` phase) or last vote result object.
  - Vote history per round.
- Extend repositories if needed to persist new vote state (`InMemoryMatchRepository` already stores match snapshot).

## Step 6: Tests

- Domain tests for vote casting, duplicate voting, invalid phases.
- End-to-end tests:
  - Voting phase accepts casts and rejects outside voting.
  - Tally produces expected elimination (highest vote).
  - Tie scenario leaves players alive and returns neutral result.
  - Vote resolution happens before abilities in the next phase (if relevant).
- Integration test ensures API returns vote results after `POST /match/:matchId/phase` transitions out of voting.

## Verification

1. Run `npm run typecheck`.
2. Run targeted tests covering vote logic and overall suite.
3. Simulate a full round: join players, start match, cast votes, advance phases, inspect elimination state/vote summary.

## Scalability Notes

- A future `VoteModifier` system can publish modifiers (e.g., `double_vote`) into `ResolutionContext`.
- Additional voting phases (e.g., instant votes or emergency meetings) can reuse `castVote`/`tallyVotes`.
