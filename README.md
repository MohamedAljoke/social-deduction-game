# Social Deduction Game

**Live Demo:**\
https://social-deduction-game-tvek.onrender.com/

A **real-time multiplayer social deduction game** built to explore
**clean architecture, real-time systems, and scalable backend design**
using TypeScript.

Players join a lobby, receive secret roles, and attempt to uncover the
impostors through discussion, abilities, and voting.

This project focuses on **engineering architecture**, not just gameplay.

---

# Preview

Features a **live multiplayer session**, including:

- Lobby creation and player join
- Role assignment
- Game phases (night/day)
- Voting system
- Player abilities
- AI-generated game narration
- Rematch system

---

# Tech Stack

## Backend

- TypeScript
- Node.js
- WebSockets
- Clean Architecture (DDD-inspired)
- Vitest

## Frontend

- React
- Vite
- TypeScript
- Playwright (E2E tests)

## AI Integration

Optional **AI Game Master** capable of narrating events using:

- Gemini
- OpenRouter
- Failover provider strategy

---

# Architecture Overview

Frontend Backend ────────────────────────────────────────────────────
React UI REST API features/ infrastructure/http ↓ ↓ GameSessionService →
application use cases ↓ ↓ GameGateway (WebSocket) ← domain events ↓ ↓
React state domain entities Match Player GamePhase

### Key Principles

- Backend authoritative state
- Event-driven real-time updates
- Separation between domain and infrastructure
- Use-case oriented application layer

---

# Monorepo Structure

    social-deduction-game/
    ├── backend/     # API + WebSocket server
    ├── client/      # React frontend
    ├── docs/        # Architecture notes
    └── package.json

---

# Key Source Files

## Backend

File Purpose

---

backend/src/domain/entity/match.ts Core Match aggregate
backend/src/application/ Game use cases
backend/src/application/ai/ AI narrator pipeline
backend/src/infrastructure/websocket/mod.ts WebSocket server
backend/src/infrastructure/http/routes/match.ts REST endpoints
backend/src/container.ts Dependency injection

---

## Frontend

File Purpose

---

client/src/context/GameContext.tsx Game state management
client/src/context/GameSessionService.ts Session orchestration
client/src/infrastructure/ws/GameGateway.ts WebSocket gateway
client/src/infrastructure/http/ApiClient.ts REST client
client/src/types/events.ts Event contracts

---

# Development

Install dependencies:

    npm install
    npm run install:client
    npm run install:server

Run both servers:

    npm run dev

Backend:

    http://localhost:3000
    ws://localhost:3000/ws

---

# Testing

Backend tests:

    npm run test --prefix backend -- --run

Frontend E2E tests:

    npm run test:e2e --prefix client

---

# AI Game Master

The game optionally supports an **AI narrator** that describes important
events such as:

- Game start
- Phase transitions
- Eliminations
- Game results

Providers supported:

- Gemini
- OpenRouter
- Fallback / failover strategy

Example configuration:

    AI_GAME_MASTER_ENABLED=true
    GEMINI_MODEL=
    OPENROUTER_MODEL=

---

# Engineering Focus

This project was built to demonstrate:

- Real-time multiplayer architecture
- Domain-driven design patterns
- WebSocket event modeling
- Separation of domain / application / infrastructure layers
- Testable backend architecture
- Frontend real-time state orchestration

---

# Future Improvements

Possible improvements include:

- PostgreSQL persistence
- Match history
- Spectator mode
- Public matchmaking
- Role customization
- Player statistics

---

# Contributing

Before contributing please read:

    CONTRIBUTING.md

Pull requests use:

    .github/PULL_REQUEST_TEMPLATE.md

Issue templates:

    .github/ISSUE_TEMPLATE/

---

# Author

**Mohamed Aljoke**

Backend engineer focused on:

- Node.js
- TypeScript
- Real-time systems
- AWS architecture

Blog:\
https://devmohami.hashnode.dev/

YouTube:\
https://www.youtube.com/channel/UCkUgsd4IUob6IUVF1EP13eA
