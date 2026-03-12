import {
  AiNarrator,
  NarrationContext,
  NarrationResult,
} from "../../application/ai/AiNarrator";

export class FailoverAiNarrator implements AiNarrator {
  constructor(private readonly narrators: readonly AiNarrator[]) {}

  async generateNarration(
    input: NarrationContext,
  ): Promise<NarrationResult | null> {
    for (const narrator of this.narrators) {
      try {
        const result = await narrator.generateNarration(input);
        if (result) {
          return result;
        }
      } catch {
        continue;
      }
    }

    return null;
  }
}
