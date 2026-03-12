import { describe, expect, it, vi } from "vitest";
import {
  FailoverAiNarrator,
  NamedAiNarrator,
} from "../../../infrastructure/ai/FailoverAiNarrator";
import {
  AiNarrator,
  NarrationContext,
  NarrationResult,
} from "../../../application/ai/AiNarrator";
import { Alignment } from "../../../domain/entity/template";
import { EffectType } from "../../../domain/entity/ability";

function createContext(): NarrationContext {
  return {
    matchId: "match-1",
    matchName: "Friday Night Match",
    phase: "discussion",
    players: [
      {
        status: "alive",
        templateName: "Oracle",
      },
    ],
    templates: [
      {
        id: "template-1",
        name: "Oracle",
        alignment: Alignment.Hero,
        abilities: [EffectType.Investigate],
      },
    ],
    event: {
      kind: "start",
      summary: "The match has started.",
      occurredAt: "2026-03-12T00:00:00.000Z",
    },
    winner: null,
  };
}

function createNarrator(
  implementation: (input: NarrationContext) => Promise<NarrationResult | null>,
): AiNarrator {
  return {
    generateNarration: vi.fn(implementation),
  };
}

function createNamedNarrator(provider: string, narrator: AiNarrator): NamedAiNarrator {
  return {
    provider,
    narrator,
  };
}

describe("FailoverAiNarrator", () => {
  it("returns the first successful narration result", async () => {
    const primary = createNarrator(async () => null);
    const fallback = createNarrator(async () => ({
      kind: "start",
      message: "The Oracle opens the night with a whisper.",
    }));

    const narrator = new FailoverAiNarrator([
      createNamedNarrator("primary", primary),
      createNamedNarrator("fallback", fallback),
    ]);

    await expect(narrator.generateNarration(createContext())).resolves.toEqual({
      kind: "start",
      message: "The Oracle opens the night with a whisper.",
    });
    expect(primary.generateNarration).toHaveBeenCalledTimes(1);
    expect(fallback.generateNarration).toHaveBeenCalledTimes(1);
  });

  it("continues to the next provider when one throws", async () => {
    const primary = createNarrator(async () => {
      throw new Error("quota exceeded");
    });
    const fallback = createNarrator(async () => ({
      kind: "start",
      message: "The storyteller wakes through the second lantern.",
    }));

    const narrator = new FailoverAiNarrator([
      createNamedNarrator("primary", primary),
      createNamedNarrator("fallback", fallback),
    ]);

    await expect(narrator.generateNarration(createContext())).resolves.toEqual({
      kind: "start",
      message: "The storyteller wakes through the second lantern.",
    });
  });

  it("returns null when every provider fails", async () => {
    const primary = createNarrator(async () => null);
    const fallback = createNarrator(async () => null);

    const narrator = new FailoverAiNarrator([
      createNamedNarrator("primary", primary),
      createNamedNarrator("fallback", fallback),
    ]);

    await expect(narrator.generateNarration(createContext())).resolves.toBeNull();
  });
});
