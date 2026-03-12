import { describe, expect, it, vi } from "vitest";
import { Alignment } from "../../../domain/entity/template";
import { EffectType } from "../../../domain/entity/ability";
import { OpenRouterAiNarrator } from "../../../infrastructure/ai/OpenRouterAiNarrator";

function createContext() {
  return {
    matchId: "match-1",
    matchName: "Friday Night Match",
    phase: "resolution" as const,
    players: [
      {
        name: "Alice",
        status: "alive" as const,
        templateName: "Detective",
      },
      {
        name: "Bob",
        status: "dead" as const,
        templateName: "Assassin",
      },
    ],
    templates: [
      {
        id: "template-1",
        name: "Detective",
        alignment: Alignment.Hero,
        abilities: [EffectType.Investigate],
      },
      {
        id: "template-2",
        name: "Assassin",
        alignment: Alignment.Villain,
        abilities: [EffectType.Kill],
      },
    ],
    event: {
      kind: "elimination" as const,
      summary: "Um jogador caiu durante a resolucao.",
      occurredAt: "2026-03-12T04:00:00.000Z",
    },
    winner: null,
  };
}

describe("OpenRouterAiNarrator", () => {
  it("maps the narration context into an OpenRouter chat completions request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "The room falls silent as Bob drops from the board.",
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

    const narrator = new OpenRouterAiNarrator(
      {
        provider: "openrouter",
        apiKey: "test-key",
        model: "test-model",
        timeoutMs: 5000,
        temperature: 0.4,
        maxOutputTokens: 120,
        siteUrl: "https://portfolio.example",
        appName: "Social Deduction Game",
      },
      fetchMock,
    );

    const result = await narrator.generateNarration(createContext());

    expect(result).toEqual({
      kind: "elimination",
      message: "The room falls silent as Bob drops from the board.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
      "HTTP-Referer": "https://portfolio.example",
      "X-Title": "Social Deduction Game",
    });

    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      model: "test-model",
      temperature: 0.4,
      max_tokens: 120,
      stream: false,
      user: "match:match-1",
    });
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toMatchObject({ role: "system" });
    expect(body.messages[1]).toMatchObject({ role: "user" });
    expect(body.messages[1].content).toContain('"matchName": "Friday Night Match"');
    expect(body.messages[1].content).toContain('"summary": "Um jogador caiu durante a resolucao."');
  });

  it("returns null when the provider responds with an error", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("upstream error", { status: 502 }),
    );

    const narrator = new OpenRouterAiNarrator(
      {
        provider: "openrouter",
        apiKey: "test-key",
        model: "test-model",
        timeoutMs: 5000,
      },
      fetchMock,
    );

    await expect(narrator.generateNarration(createContext())).resolves.toBeNull();
  });

  it("accepts non-chat text responses from OpenRouter", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              text: "A cidade prende a respiracao enquanto o Assassino cai.",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const narrator = new OpenRouterAiNarrator(
      {
        provider: "openrouter",
        apiKey: "test-key",
        model: "test-model",
        timeoutMs: 5000,
      },
      fetchMock,
    );

    await expect(narrator.generateNarration(createContext())).resolves.toEqual({
      kind: "elimination",
      message: "A cidade prende a respiracao enquanto o Assassino cai.",
    });
  });
});
