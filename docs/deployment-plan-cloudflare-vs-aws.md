# Deployment Plan: Cloudflare vs AWS

## Objective

Host the social deduction game with:

- low monthly cost at small scale
- stable real-time WebSocket sessions
- minimal operational overhead
- clear path to scale

## Current Backend Reality

The current backend keeps match state and WebSocket rooms in memory in a single process. This is good for local development, but it does not survive restarts and is hard to scale horizontally.

## Option A: Cloudflare (Recommended for lowest ops + low idle cost)

### Target architecture

- **Cloudflare Worker** as public API entrypoint (`/match`, `/match/:id`, `/ws`)
- **Durable Object per match** (`MatchRoomDO`) as single-writer authority for:
  - match state
  - connected sockets
  - event broadcast
- **Durable Object for lobby index** (`LobbyIndexDO`) for active/public match listing
- **Durable Object storage (SQLite-backed)** for durable state
- Optional:
  - **D1** for analytics/reporting queries
  - **R2** for logs/replays/archive

### Why this fits this game

- WebSocket sessions and game state for one match are naturally mapped to one Durable Object.
- Single-threaded object execution avoids cross-node race conditions for match actions.
- WebSocket hibernation model can reduce cost during idle periods.

### Cloudflare migration steps

1. Add Worker runtime and route existing HTTP endpoints through Worker handlers.
2. Create `MatchRoomDO` and move match repository + realtime publisher to DO adapters.
3. Route WebSocket upgrade to the match DO by `matchId`.
4. Add `LobbyIndexDO` for create/list lifecycle.
5. Implement reconnect + state resync flow on client.
6. Add cleanup policy for finished/abandoned matches (TTL + alarm-based deletion).
7. Run canary rollout, then full cutover.

### Cloudflare cost drivers to monitor

- Worker requests
- Durable Object active duration
- Durable Object storage read/write volume
- WebSocket message frequency (especially noisy events)

## Option B: AWS (Recommended only if you must stay in AWS ecosystem)

### Target architecture

- **API Gateway HTTP API** for REST endpoints
- **API Gateway WebSocket API** for real-time channel
- **Lambda** for command handlers (`create`, `join`, `start`, `vote`, `ability`, `phase`)
- **DynamoDB** for match state, players, and connection registry
- Optional:
  - **EventBridge/SQS** for async fan-out workflows
  - **ElastiCache Redis** for faster ephemeral room operations

### AWS-specific concerns for this game

- You need explicit connection management (connect/disconnect routes + mapping table).
- Broadcasting requires calling API Gateway Management API per connection.
- State consistency under concurrent updates requires conditional writes/transactions.
- More moving parts than Cloudflare DO for this use case.

### AWS migration steps

1. Split backend into stateless Lambda handlers.
2. Design DynamoDB schema:
   - `Match` item
   - `Connection` items keyed by `matchId`
3. Implement optimistic concurrency (version checks) for match updates.
4. Add WebSocket routes (`$connect`, `$disconnect`, `join_match`, etc.).
5. Add broadcast service to fan out events to all connections in a match.
6. Add retries/dead-letter strategy for failed sends.
7. Canary rollout, then full cutover.

### AWS cost drivers to monitor

- WebSocket connection-minutes
- WebSocket messages
- Lambda invocations + duration
- DynamoDB read/write capacity and storage

## Side-by-Side Decision Matrix

| Criterion | Cloudflare | AWS |
| --- | --- | --- |
| Realtime architecture fit | Excellent (DO per match) | Good but more manual plumbing |
| Operational complexity | Low | Medium to high |
| Idle websocket economics | Usually favorable with hibernation patterns | Can grow with connection-minute billing |
| Concurrency correctness | Built-in single-threaded object model | Must enforce via DynamoDB patterns |
| Team familiarity (you use Lambda today) | Lower initially | Higher initially |
| Time to production (for this codebase) | Medium | Medium-high |

## Recommended Path

For this specific websocket game and low-cost goal:

- **Primary recommendation: Cloudflare Durable Objects**
- **Fallback: AWS** only if your team has strict AWS standardization requirements

## Implementation Roadmap (Platform-agnostic)

### Phase 1: Stabilize contracts

- Freeze REST + WS event contracts
- Add integration tests for join/start/vote/phase/event broadcast

### Phase 2: Abstract infrastructure

- Keep domain/use-cases
- Replace in-memory repository and websocket manager with platform adapters

### Phase 3: Durable state and reconnect

- Persist match snapshots
- Support reconnect without losing room membership semantics

### Phase 4: Observability + guardrails

- Add metrics (active matches, active sockets, message rate, error rate)
- Add alerts and simple runbooks

### Phase 5: Progressive rollout

- Internal staging
- Canary traffic
- Production cutover

## Acceptance Criteria

- Players can stay connected through full match lifecycle without desync.
- Restart/deploy does not lose authoritative match state.
- P95 command latency stays acceptable under expected player count.
- Monthly cost remains inside budget target after 2 weeks of real usage.

## Practical Next Step

Start with a **Cloudflare proof-of-concept**:

1. One Worker
2. One `MatchRoomDO`
3. Only three flows first: `create`, `join`, `match_updated` broadcast

If this passes load + cost checks, continue full migration on Cloudflare.
