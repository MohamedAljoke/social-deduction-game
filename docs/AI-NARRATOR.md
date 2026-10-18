# The AI game master

A host can turn on an AI game master for a match. At the start, at each phase change and after each
resolution, it posts a short narration to the room, like a human moderator setting the scene. It's an
extra, so the game must play exactly the same when it's off or when the AI fails.

## Behind a port

The application layer owns the interface, and knows nothing about any provider:

```ts
interface AiNarrator {
  generateNarration(input: NarrationContext): Promise<NarrationResult | null>;
}
```

`createAiNarratorFromEnv` (`infrastructure/ai/`) picks the implementation at startup:

- `GeminiAiNarrator` when `GEMINI_API_KEY` is set, `OpenRouterAiNarrator` when `OPENROUTER_API_KEY` is;
- with both keys, `FailoverAiNarrator` tries them in order and moves on when one throws or returns
  nothing. `AI_PROVIDER=gemini` or `openrouter` says which goes first, `auto` keeps the default order;
- `NoopAiNarrator` when `AI_PROVIDER` is unset or `noop`, or no key is set, so local runs need no
  account.

## It can never break the game

- **It runs after the response.** `StartMatch` and `AdvancePhase` publish the game's own events first,
  then start the narration without awaiting it. A slow provider never holds up the game.
- **It always says something.** When every provider fails, a plain fallback message built from the same
  events is posted instead.
- **It only sees public events.** `NarrationContextBuilder` feeds the model what every player already
  saw (the phase, eliminations, the round), never roles or private results, so the narration can't give a
  role away.
- **It's per match.** `aiGameMasterEnabled` is part of the match's config, and the use case skips
  narration when it's off.
