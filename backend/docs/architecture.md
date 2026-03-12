# Architecture

## Domain Model

```mermaid
classDiagram
    class Match {
        <<entity>>
        +id: string
        +name: string
        +status: MatchStatus
        +phase: Phase
        +players: Player[]
        +templates: Template[]
        +actions: Action[]
        +config: MatchConfig
        +winner: MatchWinner | null
        +startWithTemplates()
        +rematch()
        +advancePhase()
        +resolveActions()
        +submitVote()
        +useAbility()
        +pullEvents()
    }

    class MatchConfig {
        <<value object>>
        +showVotingTransparency: boolean
        +aiGameMasterEnabled: boolean
    }

    class MatchStatus {
        <<enum>>
        lobby
        started
        finished
    }

    class Phase {
        <<entity>>
        +type: PhaseType
        +assertCanVote()
        +assertCanUseAbility()
        +assertCanResolve()
    }

    class PhaseType {
        <<enum>>
        discussion
        voting
        action
        resolution
    }

    class Player {
        <<entity>>
        +id: string
        +name: string
        +status: PlayerStatus
        +templateId?: string
        +kill()
        +eliminate()
        +resetForRematch()
    }

    class PlayerStatus {
        <<enum>>
        alive
        dead
        eliminated
    }

    class Template {
        <<entity>>
        +id: string
        +alignment: Alignment
        +abilities: Ability[]
        +winCondition: WinCondition
    }

    class Alignment {
        <<enum>>
        hero
        villain
        neutral
    }

    class Ability {
        <<entity>>
        +id: EffectType
        +canUseWhenDead: boolean
        +targetCount: number
        +canTargetSelf: boolean
        +requiresAliveTarget: boolean
        +priority: number
        +validateUsage()
    }

    class EffectType {
        <<enum>>
        kill
        protect
        roleblock
        investigate
        vote_shield
    }

    class Action {
        <<value object>>
        +actorId: string
        +effectType: EffectType
        +targetIds: string[]
        +stage: ResolutionStage
        +priority: number
        +cancelled: boolean
    }

    class ResolutionStage {
        <<enum>>
        TARGET_MUTATION
        DEFENSIVE
        CANCELLATION
        OFFENSIVE
        READ
    }

    Match --> MatchStatus
    Match --> Phase
    Match --> Player
    Match --> Template
    Match --> Action
    Match --> MatchConfig
    Phase --> PhaseType
    Player --> PlayerStatus
    Player --> Template
    Template --> Alignment
    Template --> Ability
    Ability --> EffectType
    Action --> EffectType
    Action --> ResolutionStage
```

## Layer Structure

```mermaid
flowchart LR
    subgraph "Outside"
        Client[HTTP / WS Clients]
    end

    subgraph "src/"
    subgraph "infrastructure"
        HTTP[HTTP Routes<br/>Express / Hono]
        WS[WebSocket Server<br/>& Publisher]
        Validators[Zod Validators]
        Persistence[In-Memory<br/>Repositories]
        AI[AI Narrator<br/>Adapters]
    end

    subgraph "application"
        UseCases[Use Cases]
        Narration[AI Narration<br/>Pipeline]
    end

        subgraph "domain"
            Entities[Entities &<br/>Domain Services]
            Ports[Ports]
        end
    end

    Client --> HTTP
    Client <--> WS
    HTTP --> Validators
    Validators --> UseCases
    UseCases --> Narration
    UseCases --> Ports
    UseCases --> Entities
    Ports --> Persistence
    Ports --> WS
    Narration --> AI
```

## Clean Architecture (Hexagonal)

```mermaid
flowchart TB

    %% ========= DOMAIN =========
    subgraph DOMAIN["Domain (Core)"]
        Entities["Entities & Services"]
        Ports["Ports (Repository + RealtimePublisher + AiNarrator)"]
    end

    %% ========= APPLICATION =========
    subgraph APPLICATION["Application Layer"]
        UseCases["Use Cases"]
        NarrationPipeline["AI Narration Pipeline"]
    end

    %% ========= INFRASTRUCTURE =========
    subgraph INFRASTRUCTURE["Infrastructure (Adapters)"]
        Controllers["HTTP / WS Controllers"]
        RepoImpl["Repository Implementations"]
        WSPublisher["WebSocketPublisher"]
        AIImpl["AI Narrator Implementations<br/>(Gemini, OpenRouter, Failover, Noop)"]
        Validators["Zod Validators"]
    end

    %% ========= DEPENDENCY RULE =========
    UseCases --> Entities
    UseCases --> Ports
    UseCases --> NarrationPipeline
    NarrationPipeline --> Ports

    Controllers --> UseCases
    Validators --> UseCases

    RepoImpl --> Ports
    RepoImpl --> Entities
    WSPublisher --> Ports
    AIImpl --> Ports

    %% ========= STYLING =========
    style DOMAIN fill:#90EE90,stroke:#2e7d32,stroke-width:2px
    style APPLICATION fill:#BBDEFB,stroke:#1565C0,stroke-width:2px
    style INFRASTRUCTURE fill:#FFE0B2,stroke:#EF6C00,stroke-width:2px
```

Domain entities and ports live in the center. Arrows flow from "defines" to "uses":

- Entities → Use Cases (domain defines, use cases use)
- Ports → Use Cases (domain defines, use cases use)
- Ports → Repositories (domain defines, repositories implement)

No arrows point into domain — it's the foundation with zero dependencies.

## AI Narrator Pipeline

When `aiGameMasterEnabled` is `true` on a match, key events trigger narration after `StartMatch` and `AdvancePhase`:

```mermaid
flowchart LR
    DomainEvents["Domain Events\n(MatchStarted, PhaseAdvanced,\nActionsResolved, MatchEnded)"]
    Mapper["PublicNarrationEventMapper\n(maps → kind + Portuguese summary)"]
    Builder["NarrationContextBuilder\n(attaches full match snapshot)"]
    Narrator["AiNarrator.generateNarration()\n(Gemini / OpenRouter / Failover)"]
    Fallback["Fallback message\n(Portuguese, no AI needed)"]
    Publisher["RealtimePublisher\n.gameMasterMessage()"]

    DomainEvents --> Mapper
    Mapper --> Builder
    Builder --> Narrator
    Narrator -- "success" --> Publisher
    Narrator -- "null / error" --> Fallback
    Fallback --> Publisher
```

**Narration kinds:** `start` · `phase` · `resolution` · `elimination` · `end`

**Events ignored:** `PlayerJoined`, `PlayerLeft`, `VoteSubmitted`, `MatchRematched`

**Provider selection** (`createAiNarratorFromEnv`):
- `GEMINI_API_KEY` → `GeminiAiNarrator`
- `OPENROUTER_API_KEY` → `OpenRouterAiNarrator`
- Both keys → `FailoverAiNarrator` (primary + secondary)
- Neither → `NoopAiNarrator` (silent)

## Action Resolution

Actions recorded during the action phase are processed when the phase advances to `resolution`:

```mermaid
flowchart TD
    Actions["Pending Actions"]
    Group["Group by ResolutionStage"]
    Sort["Sort by priority desc,\nthen actorId"]
    Loop["For each action:\ncheck roleblock → apply handler"]
    Handlers["Effect Handlers:\nKill · Protect · RoleBlock\nInvestigate · VoteShield"]
    StateChanges["Apply pending_death,\nprotected, roleblocked states"]
    Results["Emit ActionsResolved\n(effects[] for client)"]

    Actions --> Group --> Sort --> Loop --> Handlers --> StateChanges --> Results
```

**Stage execution order:** `TARGET_MUTATION` → `DEFENSIVE` → `CANCELLATION` → `OFFENSIVE` → `READ`

## Match Lifecycle

```mermaid
stateDiagram-v2
    [*] --> LOBBY : CreateMatch
    LOBBY --> LOBBY : JoinMatch / LeaveMatch
    LOBBY --> STARTED : StartMatch (assigns templates)
    STARTED --> STARTED : UseAbility / SubmitVote / AdvancePhase
    STARTED --> FINISHED : AdvancePhase (win condition met)
    FINISHED --> LOBBY : RematchMatch (resets players & phase)
```

## Key Patterns

- **Domain Entities**: Pure business logic with no external dependencies
- **Ports**: Repository, RealtimePublisher, and AiNarrator interfaces define all external contracts
- **Use Cases**: Orchestrate domain logic; depend on ports, never on implementations
- **DI Container**: `container.ts` wires everything; swap implementations without touching business logic
- **Zod Validators**: Validate request data at the HTTP layer (infrastructure)
- **Entity Isolation**: Domain entities never call infrastructure or outer layers
- **Domain Events**: Entities emit events via `pullEvents()`; use cases broadcast them
- **AI Narrator**: Optional narration layer; fully isolated behind the `AiNarrator` port with failover support
- **Match Rematch**: `Match.rematch()` resets status → LOBBY, clears actions/votes/winner, calls `player.resetForRematch()` on each player
