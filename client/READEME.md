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
    ├── app/                    # App wiring (router, providers)
    ├── domain/                 # Shared domain types (pure)
    ├── application/            # Client-side orchestration logic
    │   └── game/
    │       ├── gameStore.ts
    │       ├── useGameSession.ts
    │       └── gameCommands.ts
    │
    ├── infrastructure/         # External adapters
    │   ├── http/               # REST communication
    │   └── ws/                 # WebSocket transport layer
    │       ├── WebSocketClient.ts
    │       └── GameGateway.ts
    │
    ├── features/               # Feature-based UI modules
    │   ├── home/
    │   ├── lobby/
    │   ├── session/
    │   ├── game/
    │   └── end/
    │
    ├── shared/                 # Reusable components & utilities
    └── assets/

---

## 🔌 WebSocket Design

The WebSocket layer is split into:

### 1️⃣ Transport (Infrastructure)

- `WebSocketClient` --- low-level connection handler
- No React logic
- No business logic

### 2️⃣ Gateway (Application Boundary)

- `GameGateway`
- Encapsulates message types
- Exposes domain-level methods like:
  - `submitAction`
  - `vote`
  - `onMatchUpdated`

### 3️⃣ State Layer

- Centralized store (e.g., Zustand)
- WebSocket updates → Store
- Components consume store state

Flow:

    WebSocket → Gateway → Store → UI

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
