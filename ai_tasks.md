# AI Tasks

## Task 1: Extend Match Config

Add an `aiGameMasterEnabled` flag through the existing match config path.

Acceptance:

- backend create-match input accepts the new flag
- match snapshots include the new flag
- client match types include the new flag
- host can create a match with AI on or off

## Task 2: Define the AI Boundary

Add backend application-layer interfaces for narration.

Deliverables:

- `AiNarrator` interface
- narration input/output types
- provider-agnostic configuration contract

Acceptance:

- application code depends on interfaces only
- no domain entity imports provider-specific code

## Task 3: Define Public Narration Events

Create a public-only narration event model derived from match events.

Deliverables:

- `PublicNarrationEvent` type
- mapper from domain events to public narration events
- clear rules for which events are narratable

Acceptance:

- `MatchStarted`, `PhaseAdvanced`, public elimination, public resolution, and `MatchEnded` can produce narration triggers
- private investigation data is excluded
- unmapped or unsafe events produce no narration trigger

## Task 4: Build Narration Context

Create a context builder that combines the narration trigger with a safe match snapshot.

Context should include:

- match name
- phase
- public players and statuses
- public template names
- public event summary
- winner data when present

Acceptance:

- prompt payload contains only public information
- output format is stable enough for testing

## Task 5: Add OpenRouter Provider

Implement the first provider adapter using `OpenRouter`.

Deliverables:

- infrastructure adapter for narration generation
- env-based API key and model configuration
- timeout handling

Acceptance:

- provider can generate narration from the context contract
- provider failure returns a safe application error or null result
- no provider-specific types leak into domain or client code

## Task 6: Trigger Narration in Match Flow

Call the narrator from the application flow after eligible public events are produced.

Implementation notes:

- keep gameplay synchronous and authoritative
- narration must be best-effort only
- do not block or roll back gameplay on AI failure

Acceptance:

- eligible events can emit narration when AI is enabled
- disabled AI emits no narration
- match state updates still publish even when narration fails

## Task 7: Publish Narration Realtime Events

Extend realtime publishing and websocket contracts for the new message type.

Deliverables:

- new publisher method
- new websocket event name: `game_master_message`
- typed client gateway subscription

Acceptance:

- narration messages arrive in the match room
- message payload includes id, kind, text, and timestamp

## Task 8: Add Client Narration Feed

Render narration in a dedicated game master feed in the game screen.

Acceptance:

- feed updates live from websocket events
- feed is hidden or empty when AI is disabled
- narration does not replace core match information

## Task 9: Add Tests

Add tests around privacy, wiring, and graceful failure.

Backend tests:

- config flag plumbing
- unsafe/private events are filtered out
- safe events map correctly
- narrator failure does not break match flow
- provider adapter maps request and response correctly

Client tests:

- gateway handles `game_master_message`
- feed renders ordered narration messages
- disabled matches do not show the feed

## Task 10: Add Follow-Up Docs

Document setup and constraints after implementation starts.

Deliverables:

- env var documentation for `OpenRouter`
- note that AI is presentation-only
- note that future rule Q&A may use lightweight retrieval, not full RAG

## Recommended Build Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8
9. Task 9
10. Task 10
