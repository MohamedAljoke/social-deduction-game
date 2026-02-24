# Architecture

This project follows **Clean Architecture** principles with **Hexagonal Ports & Adapters** pattern.

## Overview

```mermaid
graph TB
    subgraph "Client Layer"
        HTTP[HTTP Clients]
        WS[WebSocket]
    end

    subgraph "Infrastructure Layer (Adapters)"
        Hono[Hono Adapter]
        Express[Express Adapter]
        InMemoryRepo[InMemory Match Repository]
    end

    subgraph "Application Layer (Use Cases)"
        CreateMatch[CreateMatch Use Case]
    end

    subgraph "Domain Layer (Core)"
        subgraph "Entities"
            Match[Match Entity]
            Player[Player Entity]
        end
        
        subgraph "Ports (Interfaces)"
            MatchRepoPort[MatchRepository Port]
            TemplateRepoPort[TemplateRepository Port]
        end
    end

    HTTP --> Hono
    HTTP --> Express
    WS --> Hono

    Hono --> CreateMatch
    Express --> CreateMatch

    CreateMatch --> MatchRepoPort
    MatchRepoPort -->|implements| InMemoryRepo

    CreateMatch --> Match
    Match --> MatchRepoPort
```

## Layer Diagram

```mermaid
flowchart LR
    subgraph "Outside"
        Client[HTTP/WebSocket Clients]
    end

    subgraph "src/"
        subgraph "infrastructure (Adapters)"
            HTTP[HTTP Servers<br/>hono_adapter.ts<br/>express_adapter.ts]
            Persistence[Persistence<br/>InMemoryMatchRepository]
        end

        subgraph "application (Use Cases)"
            UseCases[CreateMatch.ts<br/>Use Cases]
        end

        subgraph "domain (Core)"
            Entities[Entities<br/>match.ts]
            Ports[Ports/Interfaces<br/>MatchRepository.ts<br/>TemplateRepository.ts]
        end
    end

    Client --> HTTP
    HTTP --> UseCases
    UseCases --> Ports
    UseCases --> Entities
    Ports -->|implemented by| Persistence
```

## Directory Structure

| Layer | Folder | Responsibility |
|-------|--------|----------------|
| **Domain** | `src/domain/` | Entities, business rules, port interfaces |
| **Application** | `src/application/` | Use cases orchestrating domain logic |
| **Infrastructure** | `src/infrastructure/` | Adapters (HTTP servers, persistence) |

## Dependency Rule

- `application` depends on `domain`
- `infrastructure` depends on `domain` (via ports)
- `domain` has **no** external dependencies

## Key Files

- **Domain**: `src/domain/entity/match.ts`, `src/domain/ports/persistance/MatchRepository.ts`
- **Application**: `src/application/CreateMatch.ts`
- **Infrastructure**: `src/infrastructure/http/hono_adapter.ts`, `src/infrastructure/persistence/InMemoryMatchRepository.ts`
