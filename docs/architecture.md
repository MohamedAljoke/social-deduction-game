# Architecture

## Domain Model

```mermaid
classDiagram
    class Match {
        <<entity>>
        +id: string
        +name: string
        +status: MatchStatus
        +phase: PhaseType
        +players: Player[]
        +templates: Template[]
        +actions: Action[]
    }

    class MatchStatus {
        <<enum>>
        lobby
        started
        finished
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
        +endsGameOnWin: boolean
    }

    class Alignment {
        <<enum>>
        hero
        villain
        neutral
    }

    class Ability {
        <<entity>>
        +id: AbilityId
        +canUseWhenDead: boolean
        +targetCount: number
        +canTargetSelf: boolean
        +requiresAliveTarget: boolean
    }

    class AbilityId {
        <<enum>>
        kill
        protect
        roleblock
        investigate
    }

    class Action {
        <<value object>>
        +actorId: string
        +abilityId: AbilityId
        +targetIds: string[]
        +cancelled: boolean
    }

    Match --> MatchStatus
    Match --> PhaseType
    Match --> Player
    Match --> Template
    Match --> Action
    Player --> PlayerStatus
    Player --> Template
    Template --> Alignment
    Template --> Ability
    Ability --> AbilityId
```

## Layer Structure

```mermaid
flowchart LR
    subgraph "Outside"
        Client[HTTP Clients]
    end

    subgraph "src/"
    subgraph "infrastructure"
        HTTP[HTTP Servers<br/>Express / Hono]
        Validators[Zod Validators]
        Persistence[In-Memory<br/>Repositories]
    end

    subgraph "application"
        UseCases[Use Cases]
        Container[DI Container]
    end

        subgraph "domain"
            Entities[Entities]
            Ports[Ports]
        end
    end

    Client --> HTTP
    HTTP --> Validators
    Validators --> UseCases
    UseCases --> Ports
    UseCases --> Entities
    Ports --> Persistence
```

## Clean Architecture (Hexagonal)

```mermaid
flowchart TB

    %% ========= DOMAIN =========
    subgraph DOMAIN["Domain (Core)"]
        Entities["Entities"]
        Ports["Ports (Repository Interfaces)"]
    end

    %% ========= APPLICATION =========
    subgraph APPLICATION["Application Layer"]
        UseCases["Use Cases"]
    end

    %% ========= INFRASTRUCTURE =========
    subgraph INFRASTRUCTURE["Infrastructure (Adapters)"]
        Controllers["HTTP / WS Controllers"]
        RepoImpl["Repository Implementations"]
        Validators["Zod Validators"]
    end

    %% ========= DEPENDENCY RULE =========
    UseCases --> Entities
    UseCases --> Ports

    Controllers --> UseCases
    Validators --> UseCases

    RepoImpl --> Ports
    RepoImpl --> Entities

    %% ========= STYLING =========
    style DOMAIN fill:#90EE90,stroke:#2e7d32,stroke-width:2px
    style APPLICATION fill:#BBDEFB,stroke:#1565C0,stroke-width:2px
    style INFRASTRUCTURE fill:#FFE0B2,stroke:#EF6C00,stroke-width:2px
```

Domain entities and ports live in the center. Arrows flow from "defines" to "uses":

- Entities → Use Cases (domain defines, use cases use)
- Ports → Use Cases (domain defines, use cases use)
- Ports → Repositories (domain defines, repositories implement)

No arrows point into domain - it's the foundation with zero dependencies.

## Key Patterns

- **Domain Entities**: Pure business logic with no external dependencies
- **Ports**: Repository interfaces define data access contracts
- **Use Cases**: Orchestrate domain logic, depend on ports (not implementations)
- **DI Container**: Wires dependencies, enables easy swapping of implementations
- **Zod Validators**: Validate request data at the HTTP layer (infrastructure)
- **Entity Isolation**: Domain entities never call infrastructure or outer layers
- **Repository Returns**: Infrastructure returns domain entities (infra depends on domain, not vice versa)
