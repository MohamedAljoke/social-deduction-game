# Social Deduction Game Engine -- Implementation Plan

## Vision

Build a transport-agnostic, extensible social deduction game framework
supporting flexible templates, abilities, win conditions, and phase
systems.

Architecture follows: - Clean Architecture - Hexagonal (Ports &
Adapters) - Domain-driven design principles

---

# Phase 1 -- Core Gameplay Completion

## 1. UseAbility Use Case

### Goal

Allow a player to use an ability during the correct phase.

### Responsibilities

- Validate match exists
- Validate match is STARTED
- Validate correct phase
- Validate actor is alive (unless ability allows dead usage)
- Validate target count
- Validate target rules (alive, self-targeting, etc.)
- Persist action

### Output

Updated match state or confirmation payload

---

## 2. AdvancePhase Use Case

### Goal

Transition between phases safely.

### Responsibilities

- Validate match STARTED
- Move phase forward
- Trigger resolution if entering resolution phase

---

## 3. ResolveActions Use Case

### Goal

Apply all actions in correct order.

### Responsibilities

- Fetch match
- Sort actions (resolution priority if needed)
- Apply effects:
  - Kill
  - Protect
  - Roleblock
  - Investigate
- Clear round actions
- Check win conditions
- Persist updated match

---

## 4. CheckWinConditions (Domain Service)

### Goal

Determine if game has ended.

### Responsibilities

- Count alignments alive
- Evaluate custom winCondition flags
- If win met:
  - Set match status to FINISHED

---

## 5. GetMatchState Use Case

### Goal

Return match projection for client.

### Variants

- Public View (no hidden roles)
- Player View (only own role visible)
- Admin View

---

# Phase 2 -- Improvements & Hardening

## 6. Remove Mutable Getters

Return ReadonlyArray for: - players - templates - actions

---

## 7. Protect State Transitions

Ensure: - Cannot advance phase if LOBBY - Cannot add actions if
FINISHED - Cannot add players after STARTED

---

## 8. Introduce Domain Services

Create: - ActionResolver.ts - WinConditionEvaluator.ts

Avoid making Match a "God Entity".

---

# Phase 3 -- WebSocket Integration

## Goals

Enable real-time updates without modifying domain or application layers.

### Steps

1.  Create infrastructure/websocket/
2.  Call same use cases from WS handlers
3.  Emit domain events as socket messages

Optional: - Introduce domain events (MatchStarted, PhaseAdvanced,
AbilityUsed)

---

# Phase 4 -- Persistence Layer Upgrade

Replace InMemory repository with: - PostgreSQL implementation - Or
event-sourced version (optional advanced step)

---

# Phase 5 -- Advanced Features

- Resolution priority system
- Ability cooldowns
- Multi-round modifiers
- Custom phase configuration
- Spectator mode
- Replay support (action history log)

---

# Final Goal

A fully extensible social deduction engine where: - Templates define
roles - Abilities define mechanics - Phases define flow - Use cases
orchestrate domain - Infrastructure handles transport

Transport-agnostic. Framework-ready. Production-safe.
