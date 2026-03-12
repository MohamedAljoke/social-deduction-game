# Plan: Same-Lobby Rematch

## Goal

Allow a finished match to start another round in the same lobby code, keeping the same player roster, host, config, and template setup.

## Product Behavior

- Only the host can trigger rematch from the end screen.
- Rematch keeps the same match code instead of creating a linked/new match.
- Connected players are moved back to the lobby through the normal `match_updated` flow.
- Previous templates are preserved and prefilled so the host can edit them or start immediately.
- Players can still leave instead of waiting for the next round.
- Disconnected players rely only on the existing reconnect/session behavior.

## Backend Changes

- Add `POST /match/:matchId/rematch`.
- Allow rematch only when the match status is `finished`.
- Reset the existing match in place:
  - `status -> lobby`
  - `phase -> discussion`
  - clear winner, winnerAlignment, endedAt
  - clear votes, actions, and temporary round statuses
  - reset all players to `alive`
  - clear previous round template assignments
- Keep match id, player order, config, and templates unchanged.
- Publish the updated lobby snapshot through the existing realtime update path.

## Frontend Changes

- Add rematch support to the REST client and session service.
- Change the host end-screen action from leave-home to rematch.
- Keep a leave action on the end screen for all players.
- When the match snapshot returns to `lobby`, clear round-only local UI state and hydrate template-builder state from the preserved templates.
- Reuse the existing route guards so `/end` transitions back to `/lobby` automatically.

## Tests

- Backend:
  - finished match resets to same lobby with same id, players, and templates
  - rematch rejects matches that are not finished
- Frontend:
  - host end screen calls rematch
  - non-host end screen waits for host
  - reducer clears round selections and restores configured templates on rematch

## Acceptance Criteria

- A completed match can be restarted without creating a new code.
- All players in the room return to the lobby when the host triggers rematch.
- Template setup is preserved for the next round.
- The implementation adds no separate lobby aggregate, reservation system, or linked-match flow.
