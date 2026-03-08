# 🎮 Social Deduction Game --- Frontend

Frontend client for the Social Deduction Game.

This application is responsible for:

- Rendering game state
- Managing WebSocket connection
- Handling user interactions (actions, votes, templates)
- Synchronizing real-time updates from the backend

---

## 🏗 Architecture Overview

The frontend follows a layered architecture inspired by the backend
structure.

    src/
    ├── context/                # React context + orchestration service
    │   ├── GameContext.tsx       # GameProvider, useGame, reducer
    │   └── GameSessionService.ts # Orchestrates gateway + api + dispatch
    │
    ├── infrastructure/         # External adapters (no React)
    │   ├── http/
    │   │   └── ApiClient.ts      # Typed REST client
    │   └── ws/
    │       ├── WebSocketClient.ts  # Low-level WS transport
    │       └── GameGateway.ts      # Domain-aware WS bridge
    │
    ├── types/                  # Shared domain types (pure TS)
    │   ├── match.ts
    │   └── gameActions.ts
    │
    ├── features/               # Feature-based UI modules
    │   ├── home/
    │   ├── lobby/
    │   ├── game/
    │   └── end/
    │
    ├── shared/                 # Reusable components & utilities
    └── App.tsx

---

## 🔌 WebSocket & API Communication

### Connection lifecycle

```mermaid
sequenceDiagram
    participant UI as UI / Hook
    participant Svc as GameSessionService
    participant GW as GameGateway
    participant WS as WebSocketClient
    participant API as ApiClient (REST)
    participant BE as Backend :3000

    Note over UI,BE: ── Create or Join ──
    UI->>Svc: createMatch(name)
    Svc->>API: POST /match
    API-->>Svc: Match
    Svc->>API: POST /match/:id/join
    API-->>Svc: Match (with playerId)
    Svc->>UI: dispatch SET_MATCH

    UI->>Svc: joinMatch(matchId, name)
    Svc->>API: POST /match/:id/join
    API-->>Svc: Match (with playerId)
    Svc->>UI: dispatch SET_MATCH

    Note over UI,BE: ── WS connection (triggered by matchId+playerId in context) ──
    UI->>Svc: connect(matchId, playerId)
    Svc->>GW: connect()
    GW->>WS: connect(ws://localhost:3000/ws)
    WS-->>GW: connected {clientId}
    GW->>WS: send join_match {matchId, playerId}

    Note over UI,BE: ── Lobby: player events ──
    BE-->>GW: player_joined / player_left
    GW->>Svc: onPlayerJoined / onPlayerLeft
    Svc->>API: GET /match/:id
    API-->>Svc: Match
    Svc->>UI: dispatch UPDATE_MATCH

    Note over UI,BE: ── Host starts the game ──
    UI->>Svc: startMatch(matchId, templates)
    Svc->>API: POST /match/:id/start {templates}
    API-->>Svc: Match
    Svc->>UI: dispatch UPDATE_MATCH
    BE-->>GW: match_started {playerAssignments}
    GW->>Svc: onMatchStarted
    Svc->>UI: navigate("/game")

    Note over UI,BE: ── In-game: ability & phase ──
    UI->>Svc: useAbility(matchId, playerId, EffectType, targetId)
    Svc->>API: POST /match/:id/ability {actorId, EffectType, targetIds}
    BE-->>GW: match_updated {matchId, state}
    GW->>Svc: onMatchUpdated
    Svc->>UI: dispatch UPDATE_MATCH

    UI->>Svc: castVote(matchId)
    Svc->>API: POST /match/:id/phase
    BE-->>GW: phase_changed {matchId, phase}
    GW->>Svc: onPhaseChanged
    Svc->>UI: dispatch SET_PHASE

    Note over UI,BE: ── Game ends ──
    BE-->>GW: match_ended {matchId, winner}
    GW->>Svc: onMatchEnded
    Svc->>UI: navigate("/end")

    Note over UI,BE: ── Disconnect ──
    UI->>Svc: disconnect(matchId, playerId)
    Svc->>GW: leaveMatch → send leave_match
    Svc->>GW: disconnect()
    GW->>WS: disconnect()
```

---

## 🚀 Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

---

## 🧪 Testing

```bash
npm run test
```

---

## 🧠 Design Principles

- UI components are pure and declarative
- No direct WebSocket usage inside components
- All side-effects live in hooks
- Transport layer is isolated
- Message contracts mirror backend events

---

## 📡 Communication Strategy

- REST for initial match/session creation
- WebSocket for real-time game updates
- Optimistic UI updates (future enhancement)
- Reconnection strategy (future enhancement)

---

## 🏆 Long-Term Goals

- Shared TypeScript types with backend
- Message schema validation
- Event-driven client architecture
- Phase-based rendering system
