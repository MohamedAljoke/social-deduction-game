import {
  AiNarrator,
  AiNarratorConfig,
  NarrationContext,
  NarrationResult,
} from "../../application/ai/AiNarrator";

type FetchLike = typeof fetch;

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiInstruction {
  parts: Array<{ text: string }>;
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  generationConfig: {
    temperature?: number;
    maxOutputTokens?: number;
  };
  system_instruction?: GeminiInstruction;
}

interface GeminiSuccessResponse {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
}

export interface GeminiAiNarratorConfig extends AiNarratorConfig {
  apiKey: string;
}

export class GeminiAiNarrator implements AiNarrator {
  private readonly endpoint: string;

  constructor(
    private readonly config: GeminiAiNarratorConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    const baseUrl = "https://generativelanguage.googleapis.com";
    const version = "v1beta";
    this.endpoint = `${baseUrl}/${version}/models/${config.model}:generateContent`;
  }

  async generateNarration(
    input: NarrationContext,
  ): Promise<NarrationResult | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.config.apiKey,
        },
        body: JSON.stringify(this.buildRequestBody(input)),
        signal: controller.signal,
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as GeminiSuccessResponse;
      const message = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text?.trim())
        .filter(Boolean)
        .join(" ")
        .trim();

      if (!message) {
        return null;
      }

      return {
        kind: input.event.kind,
        message,
      };
    } catch (error) {
      if (this.isAbortError(error)) {
        return null;
      }

      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildRequestBody(input: NarrationContext): GeminiRequestBody {
    const systemPrompt = [
      "You are the public game master for a live social deduction match.",
      "Write one or two short sentences of story-style narration.",
      "Sound like a storyteller, not a status logger.",
      "When the safe payload includes template names, weave them into the narration naturally.",
      "Avoid flat lines like 'phase changed' or 'Bob died'.",
      "Use only the supplied public information.",
      "Do not reveal or infer hidden roles, private investigations, secret targets, or future actions.",
      "Keep the message clear, vivid, and neutral about unknowns.",
    ].join(" ");

    return {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(input, null, 2) }],
        },
      ],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    };
  }

  private isAbortError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.name === "AbortError" || error.message === "AbortError")
    );
  }
}
