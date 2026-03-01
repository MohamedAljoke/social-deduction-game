# WebSocket Implementation

## Overview

Real-time communication for game state updates. Replaces HTTP polling with WebSocket connections.

## Architecture

```mermaid
flowchart LR
    Client[Client<br/>index.html]
    WS[WebSocket<br/>Server]
    Room[Match Room<br/>Per-Match Handler]
    UseCases[Use Cases]
    Domain[Domain]

    Client <--> WS
    WS <--> Room
    Room --> UseCases
    UseCases --> Domain
```

## Events

All event types defined inline for simplicity:

```typescript
// Client → Server
type ClientEvent =
  | { type: "join_match"; matchId: string; playerId: string }
  | { type: "leave_match"; matchId: string; playerId: string }
  | { type: "use_ability"; matchId: string; actorId: string; abilityId: string; targetIds: string[] }
  | { type: "submit_vote"; matchId: string; voterId: string; targetId: string };

// Server → Client
type ServerEvent =
  | { type: "connected"; clientId: string }
  | { type: "player_joined"; matchId: string; player: Player }
  | { type: "player_left"; matchId: string; playerId: string }
  | { type: "match_started"; matchId: string; playerAssignments: Assignment[] }
  | { type: "phase_changed"; matchId: string; phase: PhaseType }
  | { type: "action_submitted"; matchId: string; actorId: string; abilityId: string; targetIds: string[] }
  | { type: "vote_submitted"; matchId: string; voterId: string; targetId: string }
  | { type: "match_updated"; matchId: string; state: MatchResponse }
  | { type: "player_killed"; matchId: string; playerId: string }
  | { type: "match_ended"; matchId: string; winner: Alignment }
  | { type: "error"; code: string; message: string };
```

## File Structure

Single module approach:

```
src/infrastructure/websocket/
└── mod.ts              # All WebSocket logic in one file
```

Or split by concern (recommended for larger teams):

```
src/infrastructure/websocket/
├── mod.ts              # Main entry, exports
├── types.ts            # Event type definitions
├── match_room.ts       # Room management per match
└── adapter.ts          # WebSocket server adapter
```

## Match Room

```typescript
class MatchRoom {
  matchId: string;
  clients: Map<string, WebSocket>;

  join(playerId: string, socket: WebSocket): void;
  leave(playerId: string): void;
  broadcast(event: ServerEvent, exclude?: string): void;
  broadcastMatchUpdate(state: MatchResponse): void;
}
```

## Integration

### Server Entry Point

```typescript
// src/infrastructure/server.ts additions
import { createWsServer } from "./websocket/mod";

const wsServer = createWsServer(httpServer);
```

### Use Case Integration

After use case execution, broadcast updates:

```typescript
const room = matchRooms.get(matchId);
room?.broadcastMatchUpdated(updatedMatch);
```

## Frontend Changes

### Current (HTTP Polling)
```javascript
setInterval(fetchGameState, 2000);
```

### Target (WebSocket)
```javascript
const ws = new WebSocket(`ws://${location.host}/ws`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case "match_updated":
      gameState = data.state;
      render();
      break;
    // ...
  }
};
```

## Broadcasting Triggers

| Action | Event |
|--------|-------|
| Player joins lobby | `player_joined` |
| Game starts | `match_started` |
| Phase advances | `phase_changed` |
| Ability used | `action_submitted` + `match_updated` |
| Vote cast | `vote_submitted` + `match_updated` |
| Player eliminated | `player_killed` + `match_updated` |
| Game ends | `match_ended` |

## Error Handling

- Invalid event → `{ type: "error"; code: "invalid_event"; message: string }`
- Not in match → `{ type: "error"; code: "not_in_match"; message: string }`
- Match not found → `{ type: "error"; code: "match_not_found"; message: string }`
