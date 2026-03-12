import { describe, expect, it } from "vitest";
import { NoopAiNarrator } from "../../../infrastructure/ai/NoopAiNarrator";
import { Alignment } from "../../../domain/entity/template";

describe("NoopAiNarrator", () => {
  it("returns null so gameplay can remain unchanged until a provider is configured", async () => {
    const narrator = new NoopAiNarrator();

    const result = await narrator.generateNarration({
      matchId: "match-1",
      matchName: "Test Match",
      phase: "discussion",
      players: [
        { id: "player-1", name: "Alice", status: "alive", templateName: "Seer" },
      ],
      templates: [{ id: "template-1", name: "Seer", alignment: Alignment.Hero }],
      event: {
        kind: "start",
        summary: "The match has started.",
        occurredAt: "2026-03-12T12:00:00.000Z",
      },
      winner: null,
    });

    expect(result).toBeNull();
  });
});
