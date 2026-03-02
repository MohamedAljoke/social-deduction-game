# Social Deduction Game Engine

This is a **general-purpose social deduction game engine** — not Werewolf, Mafia, or Among Us. It's designed to be completely customizable: players define their own roles (called "templates") with custom names, abilities, and behaviors. Think of it as a framework where you can create any social deduction game you can imagine.

The engine handles the hard stuff — phase management, action resolution, voting, targeting — so you can focus on designing the game experience you want.

## Key Features

- **Template-Driven Role System** — Create roles with any name, description, and abilities you want
- **Flexible Ability Framework** — Define abilities with effects like kill, protect, investigate, roleblock, and more
- **Clean Architecture** — Domain, Application, and Infrastructure layers with clear separation of concerns
- **Dependency Injection** — Pluggable infrastructure (in-memory storage included)
- **Type-Safe DTOs** — Zod schemas validate all input at the API boundary

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

## Documentation

- [Architecture Overview](docs/architecture.md) — Core domain model and layer diagram
- [Project Structure](docs/structure.md) — Directory organization and key files
- [Learning Resources](docs/learn/) — Deep dives into patterns and principles used in this project
