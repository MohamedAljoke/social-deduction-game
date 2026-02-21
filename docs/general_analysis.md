# Social Deduction Game - General Analysis

## Overview

This project implements a **general-purpose social deduction game engine** that is not tied to any specific game (like Werewolf, Mafia, or Among Us). Instead, it provides a flexible framework where callers can define their own templates with custom roles and rules.

## Project Structure

```
src/
├── template.ts          # Role definitions with abilities and alignment
├── ability.ts           # Ability identifiers and definitions
├── player.ts           # Player state management
├── match.ts            # Game orchestrator
├── phase.ts            # Phase cycle management
├── action.ts           # Action representation
├── errors.ts           # Domain errors
├── effects/
│   ├── IAbilityEffect.ts      # Effect interface
│   ├── EffectRegistry.ts     # Ability-to-effect mapping
│   ├── AbilityEffectFactory.ts # Registry initialization
│   ├── KillEffect.ts         # Kill implementation
│   ├── ProtectEffect.ts      # Protect implementation
│   └── index.ts              # Exports
└── resolution/
    ├── ResolutionState.ts    # Resolution context
    └── ResolutionEvent.ts    # Event types
```

## Core Concepts

### 1. Template System

The template is the fundamental building block for creating games. It defines:

- **id**: Unique identifier for the template
- **alignment**: Villain, Hero, or Neutral
- **abilities**: List of abilities the template can use

```typescript
class Template {
  constructor(
    public readonly id: string,
    public readonly alignment: Alignment,
    public readonly abilities: Ability[],
  ) {}
}
```

### 2. Ability System

Abilities define what actions a player can take:

```typescript
class Ability {
  constructor(
    public readonly id: AbilityId,
    public readonly canUseWhenDead: boolean = false,
  ) {}
}
```

### 3. Phase Cycle

The game flows through four phases in order:

1. **discussion** - Players discuss
2. **voting** - Players vote
3. **action** - Players submit actions
4. **resolution** - Actions are processed

### 4. Effect System

Effects implement what abilities actually do. Each effect:
- Has a **priority** (lower = executes first)
- Can read/modify other actions in the queue
- Receives the match and resolution state

```typescript
interface IAbilityEffect {
  readonly priority: number;
  execute(
    action: Action,
    allActions: Action[],
    match: Match,
    state: ResolutionState,
  ): void;
}
```

## How to Create Custom Games

### Step 1: Define Your Abilities

Extend the `AbilityId` enum with your custom abilities:

```typescript
export enum AbilityId {
  Kill = "kill",
  Protect = "protect",
  // Add your custom abilities
  Investigate = "investigate",
  Roleblock = "roleblock",
  Heal = "heal",
}
```

### Step 2: Create Effect Implementations

Implement `IAbilityEffect` for each ability:

```typescript
class InvestigateEffect implements IAbilityEffect {
  priority = 15;

  execute(action: Action, allActions: Action[], match: Match, state: ResolutionState): void {
    if (action.cancelled) return;
    
    for (const targetId of action.targetIds) {
      const target = match.getPlayerByID(targetId);
      const template = target.getTemplate();
      // Store investigation result for the actor
    }
  }
}
```

### Step 3: Register Effects

Add your effects to the factory:

```typescript
export class AbilityEffectFactory {
  public static createRegistry(): EffectRegistry {
    const registry = new EffectRegistry();
    
    registry.register(AbilityId.Kill, new KillEffect());
    registry.register(AbilityId.Protect, new ProtectEffect());
    registry.register(AbilityId.Investigate, new InvestigateEffect());
    
    return registry;
  }
}
```

### Step 4: Create Templates

Define your game templates:

```typescript
const detectiveTemplate = new Template(
  "detective",
  Alignment.Hero,
  [new Ability(AbilityId.Investigate)]
);

const serialKillerTemplate = new Template(
  "serial_killer",
  Alignment.Villain,
  [new Ability(AbilityId.Kill), new Ability(AbilityId.Roleblock)]
);
```

### Step 5: Run the Game

```typescript
const match = new Match();

const detective = match.addPlayer("Detective");
const killer = match.addPlayer("Killer");

detective.assignTemplate(detectiveTemplate);
killer.assignTemplate(serialKillerTemplate);

// Advance through phases
match.nextPhase(); // voting
match.nextPhase(); // action

// Submit actions
match.submitAction(detective.id, AbilityId.Investigate, [killer.id]);
match.submitAction(killer.id, AbilityId.Kill, [detective.id]);

// Resolve
match.nextPhase(); // resolution
match.resolveActions();
```

## Current Implementation Status

### Implemented Features

| Feature | Status |
|---------|--------|
| Template system | ✅ Complete |
| Ability definitions | ✅ Complete |
| Player management | ✅ Complete |
| Phase cycle | ✅ Complete |
| Action submission | ✅ Complete |
| Effect system | ✅ Complete |
| Kill effect | ✅ Complete |
| Protect effect | ✅ Complete |
| Priority resolution | ✅ Complete |
| Resolution state | ✅ Complete |

### Effects Implemented

1. **ProtectEffect** (priority: 10) - Marks targets as protected
2. **KillEffect** (priority: 20) - Eliminates unprotected targets

### Built-in Abilities

- `Kill` - Eliminates a player (unless protected)
- `Protect` - Protects a player from being killed

## Architecture Strengths

### 1. Extensibility

Adding a new ability requires:
- Adding an entry to `AbilityId` enum
- Creating an effect class implementing `IAbilityEffect`
- Registering the effect in `AbilityEffectFactory`

No changes to existing code required.

### 2. Action Interoperability

Effects can see and modify other actions in the queue, enabling:
- **Roleblock** - Cancel another player's action
- **Redirect** - Change action targets
- **Multi-action coordination** - Effects can inspect the full picture

### 3. Game Agnostic

The system doesn't assume any specific game rules. Callers define:
- What abilities exist
- What templates use which abilities
- How effects behave

This allows implementing Werewolf, Mafia, Town of Salem, or entirely new games.

### 4. Clean Separation

- **Template** defines what a player *can* do
- **Effect** defines what an ability *does*
- **Match** orchestrates the flow
- **Player** manages individual state

### 5. Priority-Based Resolution

Numeric priorities enable complex interactions:
- Protect (10) runs before Kill (20)
- Lower numbers execute first
- Easy to insert new effects at any point

## Extensibility Points

### Future Enhancements (Not Yet Implemented)

1. **Ability usage limits** - Track uses per game/per night
2. **Passive abilities** - Always-active effects (Bulletproof, Commuter)
3. **Multi-turn effects** - Delayed effects (Poison, Arson)
4. **Private information** - Per-player hidden data
5. **Event logging** - Detailed resolution history
6. **Action validation** - Targeting constraints

### Example: Adding Roleblock

```typescript
// 1. Add ability
export enum AbilityId {
  Kill = "kill",
  Protect = "protect",
  Roleblock = "roleblock", // NEW
}

// 2. Create effect
class RoleblockEffect implements IAbilityEffect {
  priority = 5;
  
  execute(action: Action, allActions: Action[], match: Match, state: ResolutionState): void {
    if (action.cancelled) return;
    
    for (const targetId of action.targetIds) {
      for (const a of allActions) {
        if (a.actorId === targetId) {
          a.cancelled = true;
        }
      }
    }
  }
}

// 3. Register
registry.register(AbilityId.Roleblock, new RoleblockEffect());
```

## Design Patterns Used

| Pattern | Usage |
|---------|-------|
| Strategy | `IAbilityEffect` - swappable implementations |
| Registry | `EffectRegistry` - maps abilities to effects |
| Factory | `AbilityEffectFactory` - creates configured registry |
| State | `ResolutionState` - passes context through resolution |

## Limitations

1. **Single action phase per cycle** - Actions are collected and resolved once per round
2. **No built-in voting logic** - Voting phase exists but has no implementation
3. **No role reveal system** - Templates are hidden but no mechanics for revealing
4. **No win conditions** - No built-in win condition checking

## Conclusion

This project provides a solid foundation for building custom social deduction games. The template-based architecture allows callers to define any combination of roles and rules without modifying the core engine. The effect system enables complex interactions between abilities while maintaining clean separation of concerns.

To create a specific game (Werewolf, Mafia, etc.), callers need only:
1. Define the desired abilities
2. Create templates with appropriate abilities
3. Implement effects for each ability
4. Set up win conditions externally
