# React Component Architecture Plan

---

## Overview

Refactor `index.html` (1800+ lines) into a clean React project with:
- Single Responsibility Principle
- Composability
- WebSocket-driven reactive state
- TypeScript for type safety

---

## Folder Structure

```
src/
├── app/
│   ├── App.tsx                 # Main app with routing
│   └── router.tsx              # React Router config
│
├── features/
│   ├── session/
│   │   ├── hooks/
│   │   │   ├── useSocket.ts   # WebSocket connection management
│   │   │   ├── useMatch.ts    # Match state & actions
│   │   │   └── useGamePhase.ts
│   │   ├── context/
│   │   │   └── GameContext.tsx
│   │   └── types.ts           # Session types
│   │
│   ├── home/
│   │   ├── HomeScreen.tsx
│   │   ├── CreateGameForm.tsx
│   │   └── JoinGameForm.tsx
│   │
│   ├── lobby/
│   │   ├── LobbyScreen.tsx
│   │   ├── components/
│   │   │   ├── MatchCodeDisplay.tsx
│   │   │   ├── PlayerList.tsx
│   │   │   ├── PlayerListItem.tsx
│   │   │   ├── LobbyStatusBadge.tsx
│   │   │   └── LobbyActions.tsx  # Host-only actions
│   │   └── TemplateBuilder/
│   │       ├── TemplateBuilderScreen.tsx
│   │       ├── TemplateCard.tsx
│   │       ├── TemplateAbilitySelector.tsx
│   │       └── TemplateAlignmentSelect.tsx
│   │
│   ├── game/
│   │   ├── GameScreen.tsx
│   │   ├── components/
│   │   │   ├── PhaseBanner.tsx
│   │   │   ├── GameTimer.tsx
│   │   │   ├── PlayerGrid.tsx
│   │   │   ├── GamePlayerCard.tsx
│   │   │   ├── RoleCard.tsx
│   │   │   ├── GameLog.tsx
│   │   │   └── GameActions.tsx
│   │   └── phases/
│   │       ├── DiscussionPhase.tsx
│   │       ├── ActionPhase.tsx
│   │       │   ├── AbilityButtons.tsx
│   │       │   ├── TargetSelector.tsx
│   │       │   └── ActionConfirmDialog.tsx
│   │       ├── VotingPhase.tsx
│   │       │   ├── VoteSelector.tsx
│   │       │   └── VoteConfirmDialog.tsx
│   │       └── ResolutionPhase.tsx
│   │
│   └── end/
│       ├── EndScreen.tsx
│       ├── WinnerDisplay.tsx
│       └── RoleRevealList.tsx
│
├── shared/
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Spinner.tsx
│   │   ├── Avatar.tsx
│   │   └── Badge.tsx
│   │
│   ├── ui/
│   │   ├── ScreenContainer.tsx
│   │   └── ScreenWrapper.tsx   # For transitions
│   │
│   └── styles/
│       └── variables.css       # CSS custom properties
│
├── services/
│   ├── api.ts                 # REST API client
│   └── socket.ts              # WebSocket client (singleton)
│
└── types/
    ├── api.ts                 # API response types
    ├── game.ts                # Game state types
    └── events.ts             # WebSocket event types
```

---

## Component Hierarchy

```
App
├── GameProvider (Context)
│   └── Router
│       ├── HomeScreen
│       │   ├── CreateGameForm
│       │   └── JoinGameForm
│       │
│       ├── LobbyScreen
│       │   ├── MatchCodeDisplay
│       │   ├── LobbyStatusBadge
│       │   ├── PlayerList
│       │   │   └── PlayerListItem (x N)
│       │   ├── LobbyActions (Host only)
│       │   │   ├── ConfigureTemplatesButton
│       │   │   └── StartGameButton
│       │   │
│       │   └── TemplateBuilderScreen (Modal)
│       │       └── TemplateCard (x N)
│       │           ├── TemplateNameInput
│       │           ├── TemplateAlignmentSelect
│       │           └── TemplateAbilitySelector
│       │
│       ├── GameScreen
│       │   ├── PhaseBanner
│       │   ├── GameTimer
│       │   ├── RoleCard (if alive & in action phase)
│       │   ├── PlayerGrid
│       │   │   └── GamePlayerCard (x N)
│       │   │
│       │   ├── GameActions
│       │   │   ├── DiscussionPhase (no actions)
│       │   │   ├── ActionPhase
│       │   │   │   ├── AbilityButtons
│       │   │   │   └── TargetSelector
│       │   │   │       └── ActionConfirmDialog
│       │   │   └── VotingPhase
│       │   │       ├── VoteSelector
│       │   │       └── VoteConfirmDialog
│       │   │
│       │   └── GameLog
│       │
│       └── EndScreen
│           ├── WinnerDisplay
│           └── RoleRevealList
```

---

## State Management

### GameContext (React Context + useReducer)

```typescript
interface GameState {
  matchId: string | null;
  playerId: string | null;
  isHost: boolean;
  players: Player[];
  templates: Template[];
  phase: PhaseType;
  status: MatchStatus;
  actions: Action[];
  selectedAbility: string | null;
  selectedTarget: string | null;
  selectedVote: string | null;
}

type GameAction =
  | { type: 'SET_MATCH'; payload: MatchResponse }
  | { type: 'UPDATE_PLAYERS'; payload: Player[] }
  | { type: 'SET_PHASE'; payload: PhaseType }
  | { type: 'SELECT_ABILITY'; payload: string | null }
  | { type: 'SELECT_TARGET'; payload: string | null }
  | { type: 'SELECT_VOTE'; payload: string | null }
  | { type: 'RESET' };
```

### WebSocket Event Handling

```
Socket Events → useSocket hook → dispatch(GameAction) → GameContext
```

| Server Event | Client Action |
|--------------|---------------|
| `player_joined` | `UPDATE_PLAYERS` (fetch match) |
| `player_left` | `UPDATE_PLAYERS` (fetch match) |
| `match_started` | Navigate to GameScreen |
| `phase_changed` | `SET_PHASE` |
| `match_updated` | `SET_MATCH` |
| `match_ended` | Navigate to EndScreen |

---

## Component Responsibilities

### Shared Components

| Component | Responsibility |
|-----------|---------------|
| `Button` | Variants: primary, secondary, danger. Disabled state. Loading state with spinner. |
| `Card` | Reusable container with border, padding, shadow. |
| `Input` | Label, placeholder, error state, maxLength. |
| `Avatar` | Initials with gradient background. Takes index for color. |
| `Badge` | Status indicators (alive, dead, host, etc.) |
| `Spinner` | Loading indicator |
| `Modal` | Overlay with close button, children content |

### Feature Components

| Component | Responsibility |
|-----------|---------------|
| `PlayerListItem` | Avatar + name + optional host badge |
| `MatchCodeDisplay` | Large monospace code with copy button |
| `PhaseBanner` | Gradient banner with phase title/description |
| `GamePlayerCard` | Avatar, name, status. Click handler for targeting. Selected state. |
| `AbilityButtons` | Render abilities based on current player's template |
| `TargetSelector` | Highlight selectable targets during action phase |
| `VoteSelector` | Allow single player selection for voting |
| `GameLog` | Scrollable list of game actions with actor → target format |

---

## API Integration

### REST Endpoints

```typescript
// Match management
POST   /api/match           → { id, ... }
GET    /api/match           → Match[]
GET    /api/match/:id       → Match
POST   /api/match/:id/join  → Match
POST   /api/match/:id/start → Match
POST   /api/match/:id/phase → Match

// Game actions
POST   /api/match/:id/ability → { success }
```

### WebSocket Events

```typescript
// Client → Server
{ type: 'join_match', matchId, playerId }
{ type: 'leave_match', matchId, playerId }

// Server → Client
{ type: 'connected', clientId }
{ type: 'player_joined', matchId, player }
{ type: 'player_left', matchId, playerId }
{ type: 'match_started', matchId, playerAssignments }
{ type: 'phase_changed', matchId, phase }
{ type: 'match_updated', matchId, state }
{ type: 'match_ended', matchId, winner }
```

---

## CSS Architecture

### Approach: CSS Modules + CSS Variables

```
src/
├── shared/
│   └── styles/
│       ├── variables.css     # All CSS custom properties
│       └── global.css        # Reset, base styles
│
└── features/
    └── [feature]/
        └── [Component].module.css
```

### CSS Variables (from index.html)

```css
:root {
  --bg-primary: #0f0f1a;
  --bg-secondary: #1a1a2e;
  --bg-card: #16213e;
  --accent-primary: #e94560;
  --accent-secondary: #ff6b6b;
  --text-primary: #ffffff;
  --text-secondary: #a0a0b8;
  --success: #4ade80;
  --warning: #fbbf24;
  /* ... */
}
```

---

## Migration Strategy

### Phase 1: Setup
1. Initialize React project (Vite + TypeScript)
2. Set up routing
3. Create shared UI components
4. Implement API service layer

### Phase 2: Core Features
1. Home screen (Create/Join forms)
2. Lobby screen with player list
3. Template builder

### Phase 3: Game Flow
1. Game screen with phase rendering
2. Action phase with ability selection
3. Voting phase

### Phase 4: Polish
1. End screen
2. WebSocket reconnection logic
3. Animations/transitions
4. Error handling

---

## Testing Strategy

| Layer | Approach |
|-------|----------|
| Components | Vitest + React Testing Library |
| Hooks | Vitest (unit tests) |
| Integration | Playwright (e2e) |
| API | Mock Service Worker (MSW) |

---

## Key Principles

1. **Pass game state via Context** - Never fetch in child components
2. **WebSocket as single source of truth** - REST only for initial load
3. **Components are dumb** - All logic in hooks
4. **Phase-based rendering** - Show/hide based on `gameState.phase`
5. **Backend authoritative** - No win conditions or validation on frontend
