# 🎮 Social Deduction Game

A real-time multiplayer social deduction game built with:

- TypeScript
- Clean Architecture (DDD-inspired backend)
- WebSockets for real-time gameplay
- Feature-oriented frontend structure

---

# 🏗 Monorepo Structure

    social-deduction-game/
    ├── backend/     # DDD-based API + WebSocket server
    ├── client/      # Frontend application
    └── package.json

---

# ⚙️ Development

Install root dependencies:

```bash
npm install
```

Install client dependencies:

```bash
npm run dev:client-install
```

Install backend dependencies:

```bash
npm run dev:server-install
```

---

# 🚀 Run Both Frontend & Backend

```bash
npm run dev
```

This runs:

- Backend server
- Frontend dev server

Using `concurrently`.

---

# 🧪 Testing

Run backend tests:

```bash
npm run dev:server-test
```

Run frontend tests:

```bash
npm run dev:client-test
```

---

# 🧠 Architecture Philosophy

## Backend

- Domain layer
- Application use cases
- Infrastructure adapters
- Repository pattern
- Zod validation at boundaries
- In-memory persistence (swappable)

## Frontend

- Transport isolated from UI
- WebSocket gateway pattern
- Centralized state management
- Feature-based UI modules

---

# 🔄 Communication Model

    Frontend Gateway  <---->  Backend Use Cases
    Frontend Store    <---->  Backend Domain Events

WebSocket messages reflect domain events rather than UI events.

---

# 🎯 Project Goals

- Clean separation of concerns
- Highly testable architecture
- Scalable real-time engine
- Easy migration to PostgreSQL
- Easily extendable ability system
