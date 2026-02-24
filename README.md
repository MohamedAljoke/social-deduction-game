# Social Deduction Game

A multiplayer social deduction game built with TypeScript, following Clean Architecture principles.

## Overview

This is a general-purpose social deduction game — similar to games like Among Us, Werewolf Town of Salem —, Mafia, or where players work together to identify hidden enemies through discussion, voting, and strategic deception. The game is designed to be flexible, supporting various game modes and role configurations.

## Features

- **Multiple Game Modes** — Support for different social deduction gameplay styles
- **Role System** — Configurable roles with unique abilities
- **Real-time Gameplay** — Lobby system with game state management
- **Clean Architecture** — Well-structured codebase using hexagonal ports & adapters
- **Dual HTTP Adapters** — Works with both Express and Hono

## Tech Stack

- **Language**: TypeScript
- **HTTP Servers**: Express, Hono
- **Testing**: Vitest
- **Architecture**: Clean Architecture (Hexagonal)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Tests

```bash
npm run test
```

## Project Structure

```
src/
├── domain/           # Core business logic (entities, ports)
├── application/     # Use cases
├── infrastructure/   # Adapters (HTTP servers, persistence)
└── __test__/         # End-to-end tests
```

## Architecture

The project follows Clean Architecture with hexagonal ports & adapters:

- **Domain Layer**: Core entities and business rules (no external dependencies)
- **Application Layer**: Use cases orchestrating domain logic
- **Infrastructure Layer**: External adapters (HTTP, persistence)

See `docs/architecture.md` for detailed architecture diagrams.
