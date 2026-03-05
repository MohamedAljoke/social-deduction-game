# Endgame Plan: Win Condition + End Screen

## Goal

Implement authoritative match ending in the backend and a clear end-game experience in the frontend, without waiting for the ability engine work.

## Scope (Current Step)

- Add backend win-condition evaluation and match finalization.
- Broadcast match-end state/events over WebSocket.
- Render a real end-game screen with winner + role reveal data from backend state.
- Add tests for finish flow.

## Rules (MVP)

- `hero` wins when no alive `villain` remains (and at least one alive hero exists).
- `villain` wins when alive villains are greater than or equal to alive heroes (and at least one villain exists).
- `neutral` has no solo-win in this step (shown in reveals only).
- Frontend must not compute winner logic.

## Implementation Order

## 1) Backend domain

- File: `backend/src/domain/entity/match.ts`
- Add end-state fields in match response:
  - `winnerAlignment`
  - `endedAt`
- Add win-evaluation method based on alive players + assigned template alignments.
- Run win check after phase advancement/elimination and set match status to `finished` when a winner exists.

## 2) Backend application + realtime

- File: `backend/src/application/AdvancePhase.ts`
- If match becomes finished:
  - publish `match_updated` with `status: "finished"`
  - publish `match_ended` with winner alignment
- If match is still active:
  - keep normal `phase_changed` + `match_updated` flow.

## 3) Contracts/types

- Backend publisher typing:
  - `backend/src/domain/ports/RealtimePublisher.ts`
  - `backend/src/infrastructure/websocket/WebSocketPublisher.ts`
- Frontend match/event types:
  - `client/src/types/match.ts`
  - `client/src/types/events.ts`
  - `client/src/infrastructure/ws/GameGateway.ts`

## 4) Frontend behavior + UI

- File: `client/src/features/end/EndScreen.tsx`
- Display:
  - winner team/alignment banner
  - player role reveal list (template + alignment + final status)
  - exit action (`Play Again` -> leave/reset)
- Keep route authority based on `match.status === "finished"` (already handled by route guard).

## 5) Tests

- Backend E2E (`backend/src/__test__/end-to-end/match.e2e.spec.ts`):
  - hero wins after last villain elimination
  - villain wins on parity condition
  - no winner on tie/no elimination
- Frontend E2E (`client/src/test/e2e/game.spec.ts`):
  - match transitions to `/end` when win condition is met
  - winner + role reveal are visible on end screen

## Out of Scope (Now)

- Ability-specific/custom template win conditions (`vote_eliminated`, `endsGameOnWin` semantics).
- In-place rematch/restart in the same match instance.
