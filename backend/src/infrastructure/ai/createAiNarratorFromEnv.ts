import { AiNarrator } from "../../application/ai/AiNarrator";
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

  if (provider !== "openrouter") {
    return new NoopAiNarrator();
  }

  const apiKey = env.OPENROUTER_API_KEY?.trim();
  const model = env.OPENROUTER_MODEL?.trim();

  if (!apiKey || !model) {
    return new NoopAiNarrator();
  }

  return new OpenRouterAiNarrator(
    {
      provider: "openrouter",
      apiKey,
      model,
      timeoutMs:
        parseNumber(env.OPENROUTER_TIMEOUT_MS) ?? DEFAULT_TIMEOUT_MS,
      temperature: parseNumber(env.OPENROUTER_TEMPERATURE),
      maxOutputTokens: parseNumber(env.OPENROUTER_MAX_OUTPUT_TOKENS),
      baseUrl: env.OPENROUTER_BASE_URL?.trim(),
      siteUrl: env.OPENROUTER_SITE_URL?.trim(),
      appName: env.OPENROUTER_APP_NAME?.trim(),
    },
    fetchImpl,
  );
}
