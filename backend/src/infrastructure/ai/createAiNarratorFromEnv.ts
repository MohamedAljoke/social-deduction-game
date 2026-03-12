import { AiNarrator } from "../../application/ai/AiNarrator";
import { FailoverAiNarrator, NamedAiNarrator } from "./FailoverAiNarrator";
import { GeminiAiNarrator } from "./GeminiAiNarrator";
import { NoopAiNarrator } from "./NoopAiNarrator";
import { OpenRouterAiNarrator } from "./OpenRouterAiNarrator";

const DEFAULT_TIMEOUT_MS = 10_000;

function parseNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createAiNarratorFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): AiNarrator {
  const provider = env.AI_PROVIDER?.trim().toLowerCase() ?? "noop";
  const configuredNarrators = getConfiguredNarrators(env, fetchImpl);

  console.info("[ai] creating narrator from env", {
    preferredProvider: provider || "auto",
    configuredProviders: configuredNarrators.map((entry) => entry.provider),
  });

  if (provider === "noop") {
    console.warn("[ai] AI_PROVIDER=noop, using NoopAiNarrator");
    return new NoopAiNarrator();
  }

  const orderedNarrators = orderNarrators(configuredNarrators, provider);

  if (orderedNarrators.length === 0) {
    console.warn("[ai] no AI providers configured, using NoopAiNarrator");
    return new NoopAiNarrator();
  }

  if (orderedNarrators.length === 1) {
    console.info("[ai] using single narration provider", {
      provider: orderedNarrators[0].provider,
    });
    return orderedNarrators[0].narrator;
  }

  console.info("[ai] using failover narration providers", {
    providers: orderedNarrators.map((entry) => entry.provider),
  });
  return new FailoverAiNarrator(orderedNarrators);
}

function getConfiguredNarrators(
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch,
): NamedAiNarrator[] {
  const narrators: NamedAiNarrator[] = [];

  const openRouterApiKey = env.OPENROUTER_API_KEY?.trim();
  const openRouterModel = env.OPENROUTER_MODEL?.trim();
  if (openRouterApiKey && openRouterModel) {
    narrators.push({
      provider: "openrouter",
      narrator: new OpenRouterAiNarrator(
        {
          provider: "openrouter",
          apiKey: openRouterApiKey,
          model: openRouterModel,
          timeoutMs:
            parseNumber(env.OPENROUTER_TIMEOUT_MS) ?? DEFAULT_TIMEOUT_MS,
          temperature: parseNumber(env.OPENROUTER_TEMPERATURE),
          maxOutputTokens: parseNumber(env.OPENROUTER_MAX_OUTPUT_TOKENS),
          baseUrl: env.OPENROUTER_BASE_URL?.trim(),
          siteUrl: env.OPENROUTER_SITE_URL?.trim(),
          appName: env.OPENROUTER_APP_NAME?.trim(),
        },
        fetchImpl,
      ),
    });
  }

  const geminiApiKey = env.GEMINI_API_KEY?.trim();
  const geminiModel = env.GEMINI_MODEL?.trim();
  if (geminiApiKey && geminiModel) {
    narrators.push({
      provider: "gemini",
      narrator: new GeminiAiNarrator(
        {
          provider: "gemini",
          apiKey: geminiApiKey,
          model: geminiModel,
          timeoutMs: parseNumber(env.GEMINI_TIMEOUT_MS) ?? DEFAULT_TIMEOUT_MS,
          temperature: parseNumber(env.GEMINI_TEMPERATURE),
          maxOutputTokens: parseNumber(env.GEMINI_MAX_OUTPUT_TOKENS),
        },
        fetchImpl,
      ),
    });
  }

  return narrators;
}

function orderNarrators(
  narrators: NamedAiNarrator[],
  preferredProvider: string,
): NamedAiNarrator[] {
  if (preferredProvider === "auto" || preferredProvider === "") {
    return narrators;
  }

  return narrators.slice().sort((left, right) => {
    if (left.provider === preferredProvider && right.provider !== preferredProvider) {
      return -1;
    }

    if (right.provider === preferredProvider && left.provider !== preferredProvider) {
      return 1;
    }

    return 0;
  });
}
