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
  systemInstruction?: GeminiInstruction;
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
        const bodyPreview = await response.text().catch(() => "");
        console.warn("[ai][gemini] request failed", {
          status: response.status,
          statusText: response.statusText,
          model: this.config.model,
          bodyPreview: bodyPreview.slice(0, 500),
        });
        return null;
      }

      const payload = (await response.json()) as GeminiSuccessResponse;
      const message = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text?.trim())
        .filter(Boolean)
        .join(" ")
        .trim();

      if (!message) {
        console.warn("[ai][gemini] response did not include a message", {
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
        console.warn("[ai][gemini] request timed out", {
          model: this.config.model,
          timeoutMs: this.config.timeoutMs,
        });
        return null;
      }

      const message = error instanceof Error ? error.message : String(error);
      console.error("[ai][gemini] request threw", {
        model: this.config.model,
        message,
      });
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildRequestBody(input: NarrationContext): GeminiRequestBody {
    const systemPrompt = [
      "Voce e o mestre do jogo publico de uma partida ao vivo de deducao social.",
      "Escreva sempre em portugues do Brasil.",
      "Produza uma ou duas frases curtas de narracao com tom de historia.",
      "Soe como um narrador, nao como um log de sistema.",
      "Quando o payload seguro incluir nomes de templates, use esses nomes naturalmente na narracao.",
      "Evite linhas secas como 'a fase mudou' ou 'Bob morreu'.",
      "Use apenas as informacoes publicas fornecidas.",
      "Nunca mencione nomes ou identificadores de jogadores; foque em templates, fases e resultados visiveis.",
      "Nao revele nem deduza papeis ocultos, investigacoes privadas, alvos secretos ou acoes futuras.",
      "Mantenha a mensagem clara, viva e neutra sobre o que nao e conhecido.",
    ].join(" ");

    return {
      systemInstruction: {
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
