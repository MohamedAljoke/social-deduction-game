# AI Integration Plan

## Context

This project is both:

- a portfolio project
- a real game used with friends

That means AI should add something visible and fun without making the game fragile, expensive, or hard to trust.

## Domain Placement

Using the current architecture and DDD boundaries, the domains should stay separated like this:

- Core domain: match rules, phases, votes, abilities, win conditions
- Supporting domain: AI narration orchestration and public-event translation
- Generic domain: model provider integration, HTTP client, auth/config, retries

Important rule:

The AI feature must not enter the core domain. Match rules stay deterministic and fully non-AI.

## Product Direction

The best first AI feature is an optional AI game master.

Why:

- it is visible in a portfolio
- it adds flavor without changing rules
- it fits the existing template-based match system
- it is much lower risk than AI bots

The host should enable it per match with a config toggle.

## Provider Strategy

The first provider should be `OpenRouter`, because it offers a free starting path.

But the implementation must not be tied to `OpenRouter`.

Because this project should stay usable on a free tier, the AI feature must degrade gracefully when credits run out, the provider times out, or the API key is missing.

The required decision is:

- `OpenRouter` is the initial provider in v1
- provider/model selection must sit behind a small backend interface
- switching later to `OpenAI`, `Anthropic`, or a local model must not require changes to match logic
- if the provider is unavailable, the match still runs and the game master falls back to a small hardcoded line such as "the game master is sleeping"

## V1 Goal

V1 should ship a public narrator that turns public match events into short story-like commentary.

The narration should feel like a storyteller, not a log line.

That means:

- prefer short dramatic flavor over flat status text
- use the custom template names created for the match when they are available in the safe payload
- avoid boring lines like "phase changed" or "you died"
- keep messages short enough to fit naturally into the live match UI

Good narration triggers:

- match start
- phase changes
- public kill or elimination outcomes
- public action resolution summaries
- winner summary at the end

Out of scope for v1:

- AI bots
- hidden-info narration
- private investigations
- AI making gameplay decisions
- heavy RAG or vector database work

## Why Not Full RAG

Full RAG is not the right starting point for this project.

For narration, the model mostly needs fresh structured state:

- current phase
- public player statuses
- public effects and eliminations
- template names already present in the match
- winner information

That is a structured prompting problem, not a retrieval problem.

Light retrieval can be added later for rule Q&A, using local docs and rule text. Full RAG should only be considered if the project later grows a large body of custom content or searchable match history.

## Implementation Direction

### Existing seam to build on

The current flow already gives a clean path:

1. Domain emits `MatchDomainEvent`
2. `publishMatchEvents` translates those events for realtime publishing
3. `RealtimePublisher` pushes websocket events
4. The client `GameGateway` and `GameSessionService` consume those events

The AI feature should extend that flow rather than create a parallel architecture.

### Required backend boundary

Add a narrow application-layer AI boundary with responsibilities like:

- `AiNarrator`
  - takes a public narration payload
  - returns a short narration message
- `NarrationContextBuilder`
  - converts match state plus domain events into safe public AI input
- `PublicNarrationEventMapper`
  - translates raw domain events and effects into public-only narration triggers

Important implementation rule:

Do not send raw `ActionsResolved` effect data directly to the model. Some effects contain private information, so narration input must come from a public-only translation step.

### Suggested data flow

1. Match flow completes normally.
2. Domain events are emitted as they are today.
3. Application layer maps eligible events into `PublicNarrationEvent`.
4. If `aiGameMasterEnabled` is false, stop there.
5. If enabled, build narration context from:
   - match id and name
   - current public match snapshot
   - public event summary
   - safe template names
6. Call the configured AI provider through the narrator interface.
7. Publish the returned narration as a new realtime event.
8. If AI fails, times out, or the free tier is exhausted, publish a hardcoded fallback line instead of surfacing an error to players.
9. Continue gameplay normally no matter what the AI provider does.

### Suggested contracts

Match config should grow:

- `aiGameMasterEnabled: boolean`

Backend realtime publisher should grow a public narration method:

- `gameMasterMessage(matchId, payload)`

Suggested websocket event shape:

- `type: "game_master_message"`
- `matchId: string`
- `messageId: string`
- `kind: "start" | "phase" | "resolution" | "elimination" | "end"`
- `message: string`
- `createdAt: string`

Client state should grow a separate narration feed instead of mixing AI text into the existing action list.

### OpenRouter-specific v1 notes

The first adapter should be an `OpenRouterNarrationProvider`.

Keep the provider-specific concerns in infrastructure only:

- API key handling
- base URL
- model id
- request/response mapping
- timeout and retry policy
- free-tier failure handling

Suggested environment config for v1:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- optional request timeout config

Important:

- the API key must come from env and be added later in deployment/local setup
- do not block the feature behind a missing key; if AI is enabled and the provider is unavailable, use fallback narration

## Safety Rules

The narrator must only know what every player is allowed to know publicly.

Never include:

- hidden roles that are not publicly revealed
- investigation results
- future actions
- private votes beyond what the game already exposes
- private ability targets

AI output is presentation only. It must never mutate match state or decide outcomes.

Hardcoded narrator guidance should explicitly tell the model to:

- sound like a game master telling a live story
- use player names and template names when available in the safe payload
- avoid blunt mechanical summaries
- stay within one or two short sentences

## Client Direction

The client should add a dedicated game master feed on the game screen.

Requirements:

- render messages in order
- show nothing when the match config disables AI
- keep existing match state UI as the source of truth
- tolerate delayed or missing narration

## Success Criteria

The first AI milestone is successful if:

- the host can enable AI per match
- a narration message appears for key public match events
- narration never leaks hidden information
- provider failures do not break gameplay
- `OpenRouter` is replaceable without touching core match logic

## Future Phases

Phase 2:

- rules and ability Q&A
- lightweight retrieval over local docs and ability text

Phase 3:

- post-game recap
- richer end-of-match summaries

Phase 4:

- AI bots
- template generation or balancing helpers

## Final Recommendation

Start with an optional AI game master, use `OpenRouter` first, keep the provider swappable, and implement narration through a public-event translation layer in the application boundary.
