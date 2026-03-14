# ADR-001: Collapse RealtimePublisher to a Single publish() Method

**Status:** Done
**Date:** 2026-03-14

---

## Context

`RealtimePublisher` was a domain port with **10 methods** — one per event type (`matchStarted`, `matchUpdated`, `phaseChanged`, `playerJoined`, `playerLeft`, `actionSubmitted`, `matchEnded`, `voteSubmitted`, `effectResolved`, `gameMasterMessage`).

This violated the Interface Segregation Principle in two ways:

1. **Forced over-dependency.** `publishMatchNarration()` only ever called `gameMasterMessage()` but was typed against the full 10-method interface, forcing it to depend on 9 methods it never used.

2. **Shotgun surgery on every new event.** Adding one event type required coordinated changes across 4 files: `MatchDomainEvent` union, `RealtimePublisher` interface, `publishMatchEvents` mapper, and `WebSocketPublisher` implementation. The interface change was the unnecessary one — a port shouldn't need to change when the set of events grows.

---

## The Problem

`RealtimePublisher` was a domain port with **10 methods** — one per event type:

```ts
// src/domain/ports/RealtimePublisher.ts (before)
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

- `publishMatchNarration()` received the full `RealtimePublisher` but **only called `gameMasterMessage()`** — forced to depend on 9 methods it never used.
- Every test mock had to stub all 10 methods even when testing a single event path.
- The interface coupled the *what* (event semantics) to the *how* (one method per event). Adding a new event required changing the interface itself.

### The shotgun surgery cost

Adding one new event type required **coordinated changes in 4 files**:

```
1. MatchDomainEvent union        → src/domain/events/match-events.ts
2. RealtimePublisher interface   → src/domain/ports/RealtimePublisher.ts    ← unnecessary
3. publishMatchEvents() switch   → src/application/publishMatchEvents.ts
4. WebSocketPublisher impl       → src/infrastructure/websocket/WebSocketPublisher.ts
```

File #2 was the unnecessary one. A port interface shouldn't change when the set of events grows.

### Event flow (before)

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
  │ effectResolved() has routing logic:
  │   kill → broadcastToMatch
  │   investigate → sendToPlayer (actor only)
  ▼
MatchBroadcaster → WebSocketManager → MatchRoom → WebSocket clients
```

### Key ordering guarantee

`publishMatchEvents()` enforced: **snapshot (`matchUpdated`) is always sent BEFORE `matchEnded`**. This ensures clients receive the final game state before the end notification. This invariant had to be preserved by the fix.

### The `effectResolved` routing concern

`WebSocketPublisher.effectResolved()` made a visibility decision:

```ts
effectResolved(matchId: string, effect: EffectResult): void {
  switch (effect.type) {
    case "kill":
      this.broadcaster.broadcastToMatch(matchId, { type: "player_killed", ... });
      break;
    case "investigate":
      // private — sent only to the actor
      this.broadcaster.sendToPlayer(matchId, effect.actorId, { type: "investigate_result", ... });
      break;
    // kill_blocked, protect, roleblock: silently dropped
  }
}
```

This is a transport routing concern (who sees what) that belongs in the infrastructure adapter. It was preserved as-is in the new `publish()` switch.

---

## Decision

Replace the 10-method interface with a **single `publish(event: RealtimeEvent): void` method** backed by a `RealtimeEvent` discriminated union:

```ts
export type RealtimeEvent =
  | { type: "PlayerJoined";         matchId: string; player: PlayerResponse }
  | { type: "PlayerLeft";           matchId: string; playerId: string }
  | { type: "MatchStarted";         matchId: string; playerAssignments: MatchPlayerAssignment[] }
  | { type: "VoteSubmitted";        matchId: string; voterId: string; targetId: string | null }
  | { type: "PhaseChanged";         matchId: string; phase: PhaseType }
  | { type: "EffectResolved";       matchId: string; effect: EffectResult }
  | { type: "MatchEnded";           matchId: string; winner: MatchWinner }
  | { type: "MatchSnapshotUpdated"; matchId: string; match: MatchResponse }
  | { type: "GameMasterMessage";    matchId: string; payload: GameMasterMessagePayload };

export interface RealtimePublisher {
  publish(event: RealtimeEvent): void;
}
```

`RealtimeEvent` is intentionally **separate from `MatchDomainEvent`**. Domain events are what the aggregate produces internally; realtime events are what clients receive. They differ in granularity (`ActionsResolved` fans out to multiple `EffectResolved`) and in coverage (`MatchSnapshotUpdated` and `GameMasterMessage` have no domain event counterpart; `MatchRematched` is never forwarded to clients).

---

## Files Changed

| File | Change |
|---|---|
| `src/domain/ports/RealtimePublisher.ts` | Replaced 10-method interface with `RealtimeEvent` union + `publish()` |
| `src/application/publishMatchEvents.ts` | Builds `RealtimeEvent[]`, calls `publisher.publish()` per event |
| `src/infrastructure/websocket/WebSocketPublisher.ts` | Single `publish()` method with switch on `event.type` |
| `src/application/ai/publishMatchNarration.ts` | One line: `publisher.publish({ type: "GameMasterMessage", ... })` |
| `src/__test__/application/publishMatchEvents.spec.ts` | Mock simplified to `{ publish: vi.fn() }` |
| `src/__test__/infrastructure/websocket/WebSocketPublisher.spec.ts` | Calls updated to `publisher.publish({ type: ... })` |
| `src/__test__/application/ai/publishMatchNarration.spec.ts` | Mock updated to `{ publish: vi.fn() }` |

## What Was Not Changed

- `MatchDomainEvent` union — domain layer untouched
- `Match` aggregate and `pullEvents()` — unchanged
- All 6 use cases — they call `publishMatchEvents()` whose signature is stable
- `MatchBroadcaster` interface — transport abstraction unchanged
- `WebSocketManager` / `MatchRoom` — WS infrastructure unchanged
- `container.ts` — same registration, same types

---

## Consequences

**Positive:**
- Adding a new event now requires **2–3 file changes** instead of 4. The `RealtimePublisher` interface never needs to change when events are added.
- Test mocks collapse to `{ publish: vi.fn() }` regardless of how many event types exist.
- `publishMatchNarration()` no longer depends on methods it doesn't use.

**Preserved invariants:**
- Ordering guarantee: `MatchSnapshotUpdated` is always published before `MatchEnded`. Enforced in `publishMatchEvents.ts` and verified by tests.
- Visibility routing: `EffectResolved` with `kill` broadcasts to all; `investigate` sends only to the actor. This routing logic stays in `WebSocketPublisher.publish()` as a transport concern.
- `actionSubmitted` — was present in the old interface but never called from `publishMatchEvents`. Dropped cleanly.
- `GameMasterMessagePayload` type retained (used by the narration pipeline to construct payloads before publishing).
