# Step 07: Auto-Resolve on Phase Advance

## Goal
Automatically resolve queued actions when entering `resolution`.

## Files
- `src/application/AdvancePhase.ts`

## Required Changes
- Inject `ActionResolver` dependency.
- After `match.advancePhase()`, if phase is `resolution`, call `match.resolveActions(resolver)`.
- Return resolution output alongside updated match payload.

## Output Contract
- No separate manual resolve endpoint required for normal flow.

## Acceptance Criteria
- Advancing into `resolution` triggers resolve exactly once.
- Advancing other phases does not resolve actions.

## Risks
- Double resolution if old endpoint remains in active use.

## Mitigation
- Deprecate or remove explicit `/resolve` route, or guard idempotently.
