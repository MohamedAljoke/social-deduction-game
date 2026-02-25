# Migration Flow: Legacy → Src

## Principles
- **No massive Match aggregate** - decompose into smaller, focused entities
- **Focus on domain & core logic first** - HTTP/routes are secondary (will use WebSockets/DO)

---

## Phase 1: Domain Entities (Small, Focused)

### 1.1 Player-Centric
- [x] `player.ts` - Player state, PlayerStatus enum

### 1.2 Ability System (Templates define roles)
- [x] `ability.ts` - Ability definition, AbilityId enum
- [x] `action.ts` - Player action (ability usage)

### 1.3 Vote & Action
- [ ] `vote.ts` - Vote record

### 1.4 Game State
- [x] `phase.ts` - Phase management, PhaseType
- [x] `template.ts` - Game template, Alignment, WinCondition
- [ ] `gameSession.ts` - Lightweight reference to active game

---

## Phase 2: Domain Services (Pure Logic)

### 2.1 Game Flow
- [ ] `GameEngine.ts` - Orchestrates phase transitions
- [ ] `PhaseManager.ts` - Manages phase rules

### 2.2 Resolution
- [ ] `ActionResolver.ts` - Resolve abilities/actions
- [ ] `VoteTallier.ts` - Count votes, find majority
- [ ] `WinConditionEvaluator.ts` - Check win conditions

### 2.3 Effects
- [ ] `Effect.ts` - Base effect interface
- [ ] `effects/KillEffect.ts`
- [ ] `effects/ProtectEffect.ts`
- [ ] `effects/InvestigateEffect.ts`
- [ ] `effects/RoleblockEffect.ts`
- [ ] `EffectFactory.ts` - Create effects from abilities
- [ ] `EffectRegistry.ts` - Register/lookup effects

---

## Phase 3: Ports (Interfaces)

### 3.1 Persistence Ports
- [ ] `ports/GameSessionRepository.ts` - Store/retrieve games
- [ ] `ports/PlayerRepository.ts` - Store/retrieve players
- [ ] `ports/TemplateRepository.ts` - Store/retrieve templates

### 3.2 Messaging Ports (for WebSockets/DO)
- [ ] `ports/GameEventPublisher.ts` - Publish game events
- [ ] `ports/PlayerNotifier.ts` - Notify players of changes

---

## Phase 4: Application Use Cases

- [ ] `CreateTemplateUseCase.ts`
- [ ] `StartGameUseCase.ts`
- [ ] `JoinGameUseCase.ts`
- [ ] `SubmitActionUseCase.ts`
- [ ] `SubmitVoteUseCase.ts`
- [ ] `AdvancePhaseUseCase.ts`
- [ ] `GetGameStateUseCase.ts`

---

## Phase 5: Infrastructure (Later)

- [ ] Implement persistence (Digital Ocean Durable Objects)
- [ ] WebSocket handlers
- [ ] Game event subscription
- [ ] Player connection management

---

## Phase 6: Integration

- [ ] Wire use cases in `container.ts`
- [ ] Port tests
- [ ] Run e2e
