import { AiNarrator, NarrationContext, NarrationResult } from "../../application/ai/AiNarrator";

export class NoopAiNarrator implements AiNarrator {
  async generateNarration(
    _input: NarrationContext,
  ): Promise<NarrationResult | null> {
    return null;
  }
}
