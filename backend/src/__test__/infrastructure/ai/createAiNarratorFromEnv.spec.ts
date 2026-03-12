import { describe, expect, it, vi } from "vitest";
import { NoopAiNarrator } from "../../../infrastructure/ai/NoopAiNarrator";
import { OpenRouterAiNarrator } from "../../../infrastructure/ai/OpenRouterAiNarrator";
import { createAiNarratorFromEnv } from "../../../infrastructure/ai/createAiNarratorFromEnv";

describe("createAiNarratorFromEnv", () => {
  it("returns the noop narrator when no provider is configured", () => {
    const narrator = createAiNarratorFromEnv({});

    expect(narrator).toBeInstanceOf(NoopAiNarrator);
  });

  it("returns the OpenRouter narrator when OpenRouter is configured", () => {
    const narrator = createAiNarratorFromEnv(
      {
        AI_PROVIDER: "openrouter",
        OPENROUTER_API_KEY: "test-key",
        OPENROUTER_MODEL: "test-model",
      },
      vi.fn<typeof fetch>(),
    );

    expect(narrator).toBeInstanceOf(OpenRouterAiNarrator);
  });

  it("falls back to noop when OpenRouter is selected without an API key", () => {
    const narrator = createAiNarratorFromEnv({
      AI_PROVIDER: "openrouter",
      OPENROUTER_MODEL: "test-model",
    });

    expect(narrator).toBeInstanceOf(NoopAiNarrator);
  });

  it("falls back to noop when OpenRouter is selected without a model", () => {
    const narrator = createAiNarratorFromEnv({
      AI_PROVIDER: "openrouter",
      OPENROUTER_API_KEY: "test-key",
    });

    expect(narrator).toBeInstanceOf(NoopAiNarrator);
  });
});
