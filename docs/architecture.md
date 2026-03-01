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

## Key Patterns

- **Domain Entities**: Pure business logic with no external dependencies
- **Ports**: Repository interfaces define data access contracts
- **Use Cases**: Orchestrate domain logic, depend on ports (not implementations)
- **DI Container**: Wires dependencies, enables easy swapping of implementations
- **Zod Validators**: Validate request data at the HTTP layer (infrastructure)
