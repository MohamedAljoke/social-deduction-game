# AI Integration Plan

## Context

This project is both:

- a portfolio project
- a real game used with friends

That means AI should add something visible and interesting, but it should not make the game fragile, expensive, or confusing. The core game engine must stay deterministic and trustworthy.

The project already has a strong architecture style, so AI should follow the same approach:

- clean boundaries
- swappable infrastructure
- domain rules remain independent from AI providers

## Product Direction

The best first AI use case for this project is an optional AI game master.

Why this is the best first step:

- it is fun and visible in a portfolio
- it improves the game experience without controlling the rules
- it fits the custom template system well because the narrator can use player names, template names, and match events
- it avoids the higher complexity of AI bots or full autonomous agents

The AI game master should be optional per match, enabled by the host with a toggle in the client.

## V1 Goal: AI Game Master

The first version should be a public narrator that turns game events into short story-like commentary.

Examples of what it can narrate:

- match start
- phase transitions
- public action outcomes
- deaths or eliminations that are visible to all players
- end-game winner summary

Examples of what it should not do in v1:

- reveal hidden roles
- reveal private investigation results
- make decisions for the game engine
- change match outcomes
- act as a bot player

The AI output must be presentation only. The backend remains the single source of truth for rules and match state.

## Why Not Bots First

Bots are interesting, but they should not be the first AI feature.

Reasons:

- they require strategy, hidden-information handling, and fairness decisions
- they change gameplay much more than narration does
- they create more testing and balancing work
- they are a worse first step if the goal is a simple free AI feature

Bots can be a future phase after the AI narrator is stable.

## RAG Decision

Full RAG is not the right starting point for this project.

For v1, the main AI input should be structured game state and public match events, not retrieval from a large knowledge base.

The narrator mostly needs:

- current phase
- player list and public statuses
- public outcomes from actions and votes
- template names and safe descriptions
- winner information at the end

That is better handled with structured prompting than with a full retrieval system.

### Recommended approach for v1

Use structured state prompting only.

That means:

- build a safe narration context from backend events
- pass only public information to the model
- generate short narration messages

### When light retrieval makes sense

Light retrieval becomes useful if a later feature allows players to ask things like:

- what does this ability do
- what does this phase mean
- what are the rules of this match

For that, a simple retrieval layer over local rules/docs/template text is enough at first.

### When full RAG might be justified

Only consider full RAG later if the project gains a large amount of retrievable content, such as:

- many rule documents
- large template libraries
- match history summaries
- custom lore or world-building content

Until then, full RAG would add complexity without enough benefit.

## Architecture Direction

AI should be integrated through a backend boundary, not directly inside domain logic or UI components.

Recommended shape:

1. Domain emits deterministic match events.
2. Application layer builds a sanitized public narration context.
3. AI provider adapter generates narration text.
4. Transport layer publishes narration to clients.
5. Client renders narration in a dedicated game master feed.

### Important architecture rules

- domain rules must never depend on AI output
- AI failures must not break gameplay
- hidden information must be filtered before prompt creation
- model/provider choice must be replaceable

## Suggested Backend Design

Add an AI port/interface in the backend application layer.

Example responsibilities:

- `AiNarrator`: generate public narration for a match event
- `NarrationContextBuilder`: convert match events and match state into safe prompt input

Behind that port, use provider adapters so the implementation can change later without changing the rest of the app.

This keeps the current DDD style intact:

- domain = rules
- application = orchestration
- infrastructure = model/provider integration

## Suggested Client Design

Add a new game master feed in the game screen.

This feed should:

- show AI narration messages in order
- be visible only when AI is enabled for the match
- not replace existing system/game state UI

The narration feed should complement the current game UI, not become the only way players understand what happened.

## Model Strategy

The first model setup should be free or very low cost, but the code should not be tied to one provider.

Priority order:

1. simple integration
2. safe architecture
3. low cost
4. better model quality later if needed

The project should be able to start with a basic provider and switch later to a better hosted or self-hosted model.

## Risks

Main risks for this feature:

- hidden information leaking through prompts or generated text
- slow responses during live matches
- poor narration quality from cheap models
- coupling the app too tightly to one provider

These risks are manageable if the AI layer stays narrow and public-only in v1.

## Success Criteria

The first AI milestone is successful if:

- the host can enable AI per match
- the AI game master produces narration for important public events
- narration never affects the actual game rules or state
- AI failures degrade gracefully
- the feature is fun enough to use with friends
- the feature is clear and impressive enough to show in a portfolio

## Future Phases

Possible follow-up phases after v1:

### Phase 2

- ask-the-game-master rule Q&A
- ability explanations
- phase explanations

This is the point where light retrieval over docs and template text may be useful.

### Phase 3

- post-game summaries
- dramatic recaps of who did what
- match timeline narration

### Phase 4

- AI bot players
- AI-assisted balancing suggestions for templates
- smarter role or template generation tools

## Final Recommendation

Start with an optional AI game master that narrates public events.

Do not start with full RAG.
Do not start with bots.

Use structured state prompting first, preserve clean architecture boundaries, and leave room to add lightweight retrieval later if rule Q&A becomes a real product need.
