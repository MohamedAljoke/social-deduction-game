# 🎮 Social Deduction Game -- Frontend Architecture Plan

---

# 🧭 Global Application Flow

```mermaid
flowchart TD

A[Home] --> B[Create Match]
A --> C[Join Match]

B --> D[Lobby - Host View]
C --> E[Lobby - Player View]

D --> F[Template Builder]
F --> D

D --> G[Start Match]

G --> H[Game Screen]

H --> I[Action Phase]
I --> J[Resolution Phase]
J --> K[Voting Phase]
K --> L[Win Check]

L -- No Winner --> I
L -- Winner --> M[End Screen]
```

---

# 📄 Routes

    /                 → Home
    /match/:code      → Lobby OR Game (depends on status)
    /match/:code/end  → End Screen

---

# 🔌 WebSocket Lifecycle

```mermaid
sequenceDiagram

Client->>Server: POST /match
Server-->>Client: { code }

Client->>Server: WS connect (room: code)

Server-->>Client: MATCH_STATE

Player2->>Server: WS connect (room: code)
Server-->>All: PLAYER_JOINED
```

---

# 🏠 Lobby Screen

## Host View

- Display match code
- Live player list
- Template builder access
- Start match button

## Player View

- Live player list
- Waiting for host to start

```mermaid
flowchart TB

CodeBanner
PlayerList
TemplateConfig
StartButton
```

---

# 🃏 Template Builder

```mermaid
flowchart TD

AvailableAbilities --> DragToTemplate
DragToTemplate --> TemplateCard
TemplateCard --> AssignAlignment
TemplateCard --> SaveTemplate
```

---

# 🎮 Game Screen Layout

```mermaid
flowchart TB

PhaseBanner
Timer

subgraph Center
  PlayerGrid
end

SidePanel

LogPanel
```

---

# ⚔️ Action Phase Flow

```mermaid
sequenceDiagram

User->>UI: Click Ability
UI->>UI: Enter Target Mode
User->>UI: Click Target
UI->>Server: USE_ABILITY
Server-->>All: MATCH_STATE_UPDATED
```

---

# 🗳 Voting Phase Flow

```mermaid
sequenceDiagram

User->>UI: Select Player
UI->>Server: CAST_VOTE
Server-->>All: VOTE_UPDATED
```

---

# 🏁 End Screen

- Display winner
- Reveal roles
- Restart button (host only)

---

# 🧠 Core Frontend State Model

```ts
GameSession {
  match
  socket
  currentUserId
  role
}
```

Frontend should passively render authoritative backend state.

---

# 📁 Suggested Folder Structure

    src/
     ├── app/
     │   └── router.tsx
     │
     ├── features/
     │   ├── session/
     │   │   ├── useSocket.ts
     │   │   ├── useMatch.ts
     │   │   └── session.store.ts
     │   │
     │   ├── lobby/
     │   │   ├── LobbyView.tsx
     │   │   ├── TemplateBuilder.tsx
     │   │
     │   ├── game/
     │   │   ├── GameView.tsx
     │   │   ├── ActionPhase.tsx
     │   │   ├── VotingPhase.tsx
     │   │   ├── ResolutionPhase.tsx
     │   │
     │   └── end/
     │       └── EndView.tsx
     │
     ├── shared/
     │   ├── PlayerCard.tsx
     │   ├── AbilityCard.tsx
     │   └── PhaseBanner.tsx

---

# 🚀 MVP Principles

- WebSocket-driven state
- Phase-based rendering
- No frontend win logic
- Backend authoritative decisions
- Minimal animations for v1

---

# ✅ Final Concept

Backend = Deterministic game engine\
Frontend = Real-time state renderer

Clean separation of responsibilities.\
Scalable and production-ready architecture.
