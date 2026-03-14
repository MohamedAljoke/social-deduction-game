# Fixing the RealtimePublisher ISP Violation

> Detailed breakdown of the Interface Segregation Principle violation in `RealtimePublisher` and the plan to fix it.

---

## The Problem

`RealtimePublisher` is a domain port with **10 methods** — one per event type:

```ts
// src/domain/ports/RealtimePublisher.ts (current)
export interface RealtimePublisher {
  matchStarted(matchId: string, payload: MatchStartedPayload): void;
  matchUpdated(matchId: string, match: MatchResponse): void;
  phaseChanged(matchId: string, phase: PhaseType): void;
  playerJoined(matchId: string, player: PlayerResponse): void;
  playerLeft(matchId: string, playerId: string): void;
  actionSubmitted(matchId: string, actorId: string, EffectType: string, targetIds: string[]): void;
  matchEnded(matchId: string, winner: MatchWinner): void;
  voteSubmitted(matchId: string, voterId: string, targetId: string | null): void;
  effectResolved(matchId: string, effect: EffectResult): void;
  gameMasterMessage(matchId: string, payload: GameMasterMessagePayload): void;
}
```

### Why this is an ISP violation

ISP states: *"No client should be forced to depend on methods it does not use."*

- `publishMatchNarration()` receives the full `RealtimePublisher` but **only calls `gameMasterMessage()`**. It's forced to depend on 9 methods it never uses.
- Every mock in tests must stub all 10 methods even when testing a single event path.
- The interface couples the *what* (event semantics) to the *how* (one method per event). Adding a new event requires changing the interface itself.

### The shotgun surgery cost

Adding one new event type currently requires **coordinated changes in 4 files**:

```
1. MatchDomainEvent union        → src/domain/events/match-events.ts
2. RealtimePublisher interface   → src/domain/ports/RealtimePublisher.ts    ← ISP violation
3. publishMatchEvents() switch   → src/application/publishMatchEvents.ts
4. WebSocketPublisher impl       → src/infrastructure/websocket/WebSocketPublisher.ts
```

File #2 is the unnecessary one. The port interface shouldn't change when the set of events grows.

---

## Current Event Flow

```
Match aggregate
  │ emit(MatchDomainEvent)
  │ pullEvents()
  ▼
Use Case (e.g., AdvancePhaseUseCase)
  │ calls publishMatchEvents(events, snapshot, publisher)
  │ calls publishMatchNarration(events, snapshot, narrator, publisher)
  ▼
publishMatchEvents()                    publishMatchNarration()
  │ switch on event.type                  │ maps domain events → narration
  │ calls publisher.playerJoined()        │ calls AI narrator
  │ calls publisher.phaseChanged()        │ calls publisher.gameMasterMessage()
  │ calls publisher.effectResolved()      │
  │ appends publisher.matchUpdated()      │
  │ defers publisher.matchEnded()         │
  ▼                                       ▼
RealtimePublisher (port)
  ▼
WebSocketPublisher (adapter)
  │ constructs ServerEvent per method
  │ effectResolved() has domain logic:
  │   kill → broadcastToMatch
  │   investigate → sendToPlayer (actor only)
  ▼
MatchBroadcaster → WebSocketManager → MatchRoom → WebSocket clients
```

### Key ordering guarantee

`publishMatchEvents()` enforces: **`matchUpdated` (snapshot) is always sent BEFORE `matchEnded`**. This ensures clients receive the final game state before the end notification. This ordering must be preserved.

### The `effectResolved` domain logic leak

`WebSocketPublisher.effectResolved()` makes domain-level decisions:

```ts
effectResolved(matchId: string, effect: EffectResult): void {
  switch (effect.type) {
    case "kill":
      // broadcasts to everyone
      this.broadcaster.broadcastToMatch(matchId, { type: "player_killed", ... });
      break;
    case "investigate":
      // sends only to the actor (private information)
      this.broadcaster.sendToPlayer(matchId, effect.actorId, { type: "investigate_result", ... });
      break;
    // kill_blocked, protect, roleblock: silently dropped
  }
}
```

This is a transport routing concern (who sees what) that happens to live in infrastructure. It stays in the publisher because the routing decision depends on the event type — the infrastructure adapter is the right place to decide *how* to deliver.

---

## The Fix

### Core idea

Replace 10 methods with a **single `publish` method** that accepts a **`RealtimeEvent` discriminated union**:

```ts
// src/domain/ports/RealtimePublisher.ts (new)
export type RealtimeEvent =
  | { type: "PlayerJoined"; matchId: string; player: PlayerResponse }
  | { type: "PlayerLeft"; matchId: string; playerId: string }
  | { type: "MatchStarted"; matchId: string; playerAssignments: MatchPlayerAssignment[] }
  | { type: "VoteSubmitted"; matchId: string; voterId: string; targetId: string | null }
  | { type: "PhaseChanged"; matchId: string; phase: PhaseType }
  | { type: "EffectResolved"; matchId: string; effect: EffectResult }
  | { type: "MatchEnded"; matchId: string; winner: MatchWinner }
  | { type: "MatchSnapshotUpdated"; matchId: string; match: MatchResponse }
  | { type: "GameMasterMessage"; matchId: string; payload: GameMasterMessagePayload };

export interface RealtimePublisher {
  publish(event: RealtimeEvent): void;
}
```

### Why `RealtimeEvent` is separate from `MatchDomainEvent`

| `MatchDomainEvent` | `RealtimeEvent` |
|---|---|
| What the **domain aggregate** produces | What the **client** receives |
| `ActionsResolved` (batch of effects) | `EffectResolved` (one effect at a time) |
| No `MatchSnapshotUpdated` equivalent | Exists — the full state broadcast |
| No `GameMasterMessage` equivalent | Exists — from AI narration pipeline |
| `MatchRematched` (internal state reset) | Not forwarded — clients get `MatchSnapshotUpdated` |

They're related but not identical. The mapper (`publishMatchEvents`) translates between them.

---

## File-by-File Changes

### 1. `src/domain/ports/RealtimePublisher.ts`

**Before:** 10-method interface + `MatchStartedPayload` + `GameMasterMessagePayload`

**After:** `RealtimeEvent` discriminated union + single-method `RealtimePublisher` interface. Keep `GameMasterMessagePayload` (used by narration pipeline to construct payloads).

### 2. `src/application/publishMatchEvents.ts`

**Before:**
```ts
case "PlayerJoined":
  publisher.playerJoined(event.matchId, event.player);
  break;
// ...8 more cases
// then: publisher.matchUpdated(result.id, result);
// then: publisher.matchEnded(event.matchId, event.winner);
```

**After:**
```ts
case "PlayerJoined":
  realtimeEvents.push({ type: "PlayerJoined", matchId: event.matchId, player: event.player });
  break;
// ...cases build array
// append: { type: "MatchSnapshotUpdated", matchId: result.id, match: result }
// append deferred: { type: "MatchEnded", ... }
// then: for (const re of realtimeEvents) publisher.publish(re);
```

Same logic, same ordering. The function signature stays `publishMatchEvents(events, result, publisher)` — **zero changes to use case callers**.

### 3. `src/infrastructure/websocket/WebSocketPublisher.ts`

**Before:** 10 methods, each constructing a `ServerEvent` and calling broadcaster

**After:** Single `publish(event: RealtimeEvent)` with switch:

```ts
publish(event: RealtimeEvent): void {
  switch (event.type) {
    case "PlayerJoined":
      this.broadcaster.broadcastToMatch(event.matchId, {
        type: "player_joined", matchId: event.matchId, player: event.player,
      });
      break;
    case "EffectResolved":
      // visibility routing stays here
      if (event.effect.type === "kill") { ... broadcastToMatch }
      if (event.effect.type === "investigate") { ... sendToPlayer }
      break;
    case "MatchSnapshotUpdated":
      this.broadcaster.broadcastMatchUpdate(event.matchId, event.match);
      break;
    // ...etc
  }
}
```

`MatchBroadcaster` interface is **unchanged**.

### 4. `src/application/ai/publishMatchNarration.ts`

One line change:

```ts
// Before
publisher.gameMasterMessage(match.id, buildPayload(context, message));

// After
publisher.publish({ type: "GameMasterMessage", matchId: match.id, payload: buildPayload(context, message) });
```

### 5. Tests

**`publishMatchEvents.spec.ts`:**
```ts
// Before: 10-method mock
function createPublisher(): RealtimePublisher {
  return { matchStarted: vi.fn(), matchUpdated: vi.fn(), /* ...8 more */ };
}

// After: single-method mock
function createPublisher(): RealtimePublisher {
  return { publish: vi.fn() };
}

// Assertions change from:
expect(publisher.playerJoined).toHaveBeenCalledWith("match-1", player);
// To:
expect(publisher.publish).toHaveBeenCalledWith({ type: "PlayerJoined", matchId: "match-1", player });
```

Ordering test: verify `MatchSnapshotUpdated` appears in the call sequence before `MatchEnded`.

**`WebSocketPublisher.spec.ts`:**
```ts
// Before
publisher.playerJoined("match-1", { id: "player-1", ... });
// After
publisher.publish({ type: "PlayerJoined", matchId: "match-1", player: { id: "player-1", ... } });
```

**`publishMatchNarration.spec.ts`:** Update mock from 10 methods to `{ publish: vi.fn() }`.

---

## What doesn't change

| Component | Why unchanged |
|---|---|
| `MatchDomainEvent` union | Domain events are a separate concept |
| `Match` aggregate / `pullEvents()` | Domain layer untouched |
| All 6 use cases | They call `publishMatchEvents()` whose signature is stable |
| `MatchBroadcaster` interface | Transport abstraction is fine |
| `WebSocketManager` / `MatchRoom` | WS infrastructure untouched |
| `container.ts` | Same registration, same types |
| Architecture fitness tests | Dependency rules unchanged |

---

## Before vs After: Adding a New Event

### Before (4 files)

```
1. Add variant to MatchDomainEvent
2. Add method to RealtimePublisher interface    ← unnecessary coupling
3. Add case to publishMatchEvents switch
4. Implement method in WebSocketPublisher
```

### After (2-3 files)

```
1. Add variant to MatchDomainEvent
2. Add case to publishMatchEvents mapper         (maps domain → RealtimeEvent)
3. Add case to WebSocketPublisher.publish()       (maps RealtimeEvent → ServerEvent)
```

If the event doesn't come from a domain event (like `GameMasterMessage`):

```
1. Add variant to RealtimeEvent                   (if new type)
2. Add case to WebSocketPublisher.publish()
```

The port interface (`RealtimePublisher`) **never changes** when events are added.

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Ordering regression (snapshot before end) | Tests explicitly verify call order in `publishMatchEvents.spec.ts` |
| Investigate visibility regression | Test in `WebSocketPublisher.spec.ts` verifies `sendToPlayer` vs `broadcastToMatch` |
| TypeScript exhaustiveness | Switch in `WebSocketPublisher.publish()` can use `satisfies never` on default to catch unhandled variants |
| Large diff | Atomic commit — interface + all consumers in one pass. No intermediate broken state. |
