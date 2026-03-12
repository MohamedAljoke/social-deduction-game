import {
  AiNarrator,
  NarrationContext,
  NarrationResult,
} from "../../application/ai/AiNarrator";

export interface NamedAiNarrator {
  provider: string;
  narrator: AiNarrator;
}

export class FailoverAiNarrator implements AiNarrator {
  constructor(private readonly narrators: readonly NamedAiNarrator[]) {}

  async generateNarration(
    input: NarrationContext,
  ): Promise<NarrationResult | null> {
    for (const { provider, narrator } of this.narrators) {
      console.info("[ai] attempting narration provider", {
        provider,
        matchId: input.matchId,
        eventKind: input.event.kind,
      });

      try {
        const result = await narrator.generateNarration(input);
        if (result) {
          console.info("[ai] narration provider succeeded", {
            provider,
            matchId: input.matchId,
            eventKind: input.event.kind,
          });
          return result;
        }

        console.warn("[ai] narration provider returned no message", {
          provider,
          matchId: input.matchId,
          eventKind: input.event.kind,
        });
      } catch {
        console.error("[ai] narration provider threw unexpectedly", {
          provider,
          matchId: input.matchId,
          eventKind: input.event.kind,
        });
        continue;
      }
    }

    console.warn("[ai] all narration providers failed", {
      matchId: input.matchId,
      eventKind: input.event.kind,
    });
    return null;
  }
}
