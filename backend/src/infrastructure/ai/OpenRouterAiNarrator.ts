import {
  AiNarrator,
  AiNarratorConfig,
  NarrationContext,
  NarrationResult,
} from "../../application/ai/AiNarrator";

type FetchLike = typeof fetch;

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  stream: false;
  user?: string;
}

interface OpenRouterSuccessResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export interface OpenRouterAiNarratorConfig extends AiNarratorConfig {
  apiKey: string;
  baseUrl?: string;
  siteUrl?: string;
  appName?: string;
}

export class OpenRouterAiNarrator implements AiNarrator {
  private readonly endpoint: string;

  constructor(
    private readonly config: OpenRouterAiNarratorConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    this.endpoint = `${(config.baseUrl ?? "https://openrouter.ai/api/v1").replace(/\/$/, "")}/chat/completions`;
  }

  async generateNarration(
    input: NarrationContext,
  ): Promise<NarrationResult | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildRequestBody(input)),
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyPreview = await response.text().catch(() => "");
        console.warn("[ai][openrouter] request failed", {
          status: response.status,
          statusText: response.statusText,
          model: this.config.model,
          bodyPreview: bodyPreview.slice(0, 500),
        });
        return null;
      }

      const payload = (await response.json()) as OpenRouterSuccessResponse;
      const message = payload.choices?.[0]?.message?.content?.trim();

      if (!message) {
        console.warn("[ai][openrouter] response did not include a message", {
          model: this.config.model,
        });
        return null;
      }

      return {
        kind: input.event.kind,
        message,
      };
    } catch (error) {
      if (this.isAbortError(error)) {
        console.warn("[ai][openrouter] request timed out", {
          model: this.config.model,
          timeoutMs: this.config.timeoutMs,
        });
        return null;
      }

      const message = error instanceof Error ? error.message : String(error);
      console.error("[ai][openrouter] request threw", {
        model: this.config.model,
        message,
      });
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    };

    if (this.config.siteUrl) {
      headers["HTTP-Referer"] = this.config.siteUrl;
    }

    if (this.config.appName) {
      headers["X-Title"] = this.config.appName;
    }

    return headers;
  }

  private buildRequestBody(input: NarrationContext): OpenRouterRequestBody {
    return {
      model: this.config.model,
      messages: [
        {
          role: "system",
          content: [
            "You are the public game master for a live social deduction match.",
            "Write one or two short sentences of story-style narration.",
            "Sound like a storyteller, not a status logger.",
            "When the safe payload includes template names, weave them into the narration naturally.",
            "Avoid flat lines like 'phase changed' or 'Bob died'.",
            "Use only the supplied public information.",
            "Do not reveal or infer hidden roles, private investigations, secret targets, or future actions.",
            "Keep the message clear, vivid, and neutral about unknowns.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(input, null, 2),
        },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxOutputTokens,
      stream: false,
      user: `match:${input.matchId}`,
    };
  }

  private isAbortError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.name === "AbortError" || error.message === "AbortError")
    );
  }
}
