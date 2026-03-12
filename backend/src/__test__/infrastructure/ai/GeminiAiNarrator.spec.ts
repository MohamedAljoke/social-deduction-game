import { describe, expect, it, vi } from "vitest";
import { GeminiAiNarrator } from "../../../infrastructure/ai/GeminiAiNarrator";
import { NarrationContext } from "../../../application/ai/AiNarrator";
import { Alignment } from "../../../domain/entity/template";

function createContext(): NarrationContext {
  return {
    matchId: "match-1",
    matchName: "Friday Night Match",
    phase: "voting",
    players: [
      {
        id: "player-1",
        name: "Alice",
        status: "alive",
        templateName: "Oracle",
      },
    ],
    templates: [
      {
        id: "template-1",
        name: "Oracle",
        alignment: Alignment.Hero,
      },
    ],
    event: {
      kind: "phase",
      summary: "The match has entered voting.",
      occurredAt: "2026-03-12T00:00:00.000Z",
    },
    winner: null,
  };
}

describe("GeminiAiNarrator", () => {
  it("uses header auth and the documented REST request shape", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "The Oracle watches as the room turns to judgment.",
                  },
                ],
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const narrator = new GeminiAiNarrator(
      {
        provider: "gemini",
        apiKey: "gemini-key",
        model: "gemini-2.5-flash",
        timeoutMs: 10_000,
        temperature: 0.7,
        maxOutputTokens: 120,
      },
      fetchImpl,
    );

    const result = await narrator.generateNarration(createContext());

    expect(result).toEqual({
      kind: "phase",
      message: "The Oracle watches as the room turns to judgment.",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-goog-api-key": "gemini-key",
        }),
        signal: expect.any(AbortSignal),
      }),
    );

    const [, request] = fetchImpl.mock.calls[0];
    const body = JSON.parse(String(request?.body)) as {
      system_instruction?: { parts?: Array<{ text?: string }> };
      contents?: Array<{ role?: string; parts?: Array<{ text?: string }> }>;
      generationConfig?: {
        temperature?: number;
        maxOutputTokens?: number;
      };
    };

    expect(body.system_instruction?.parts?.[0]?.text).toContain(
      "public game master",
    );
    expect(body.contents?.[0]?.role).toBe("user");
    expect(body.contents?.[0]?.parts?.[0]?.text).toContain('"matchId": "match-1"');
    expect(body.generationConfig).toEqual({
      temperature: 0.7,
      maxOutputTokens: 120,
    });
  });

  it("returns null when Gemini returns an error response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("quota exhausted", { status: 429 }),
    );

    const narrator = new GeminiAiNarrator(
      {
        provider: "gemini",
        apiKey: "gemini-key",
        model: "gemini-2.5-flash",
        timeoutMs: 10_000,
      },
      fetchImpl,
    );

    await expect(narrator.generateNarration(createContext())).resolves.toBeNull();
  });

  it("returns null on abort", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(
      Object.assign(new Error("AbortError"), { name: "AbortError" }),
    );

    const narrator = new GeminiAiNarrator(
      {
        provider: "gemini",
        apiKey: "gemini-key",
        model: "gemini-2.5-flash",
        timeoutMs: 10_000,
      },
      fetchImpl,
    );

    await expect(narrator.generateNarration(createContext())).resolves.toBeNull();
  });
});
