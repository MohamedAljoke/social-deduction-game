import { MatchResponse, MatchWinner } from "../../domain/entity/match";
import { MatchDomainEvent } from "../../domain/events/match-events";
import {
  GameMasterMessagePayload,
  RealtimePublisher,
} from "../../domain/ports/RealtimePublisher";
import { AiNarrator, NarrationContext } from "./AiNarrator";
import { NarrationContextBuilder } from "./NarrationContextBuilder";
import { PublicNarrationEventMapper } from "./PublicNarrationEvent";

function formatPhase(phase: string): string {
  switch (phase) {
    case "discussion":
      return "discussao";
    case "voting":
      return "votacao";
    case "action":
      return "acao";
    case "resolution":
      return "resolucao";
    default:
      return phase;
  }
}

function formatWinnerText(winner: MatchWinner | null | undefined): string {
  if (!winner) {
    return "o tabuleiro";
  }

  if (winner.kind === "alignment") {
    return `o alinhamento ${winner.alignment}`;
  }

  return winner.templates.map((template) => template.templateName).join(", ");
}

function buildFallbackMessage(context: NarrationContext): string {
  switch (context.event.kind) {
    case "start": {
      const templateNames = context.templates.map((template) => template.name);
      const cast =
        templateNames.length > 0
          ? ` O elenco gira em torno de ${templateNames.join(", ")}.`
          : "";
      return `O mestre do jogo esta dormindo, mas ${context.matchName} comecou.${cast}`;
    }
    case "phase":
      return `O mestre do jogo esta dormindo, mas a historia avanca para a fase de ${formatPhase(context.phase)}.`;
    case "resolution":
      return "O mestre do jogo esta dormindo, mas a resolucao ainda deixa sua marca sobre a mesa.";
    case "elimination": {
      return `O mestre do jogo esta dormindo, mas ${context.event.summary.toLowerCase()}`;
    }
    case "end":
      return `O mestre do jogo esta dormindo, mas ${formatWinnerText(context.winner)} toma o capitulo final.`;
  }
}

function buildPayload(
  context: NarrationContext,
  message: string,
): GameMasterMessagePayload {
  return {
    messageId: crypto.randomUUID(),
    kind: context.event.kind,
    message,
    createdAt: context.event.occurredAt,
  };
}

export async function publishMatchNarration(
  events: MatchDomainEvent[],
  match: MatchResponse,
  narrator: AiNarrator,
  publisher: RealtimePublisher,
  options: {
    mapper?: PublicNarrationEventMapper;
    contextBuilder?: NarrationContextBuilder;
  } = {},
): Promise<void> {
  if (!match.config.aiGameMasterEnabled) {
    console.info("[ai] narration skipped because aiGameMasterEnabled is false", {
      matchId: match.id,
    });
    return;
  }

  const mapper = options.mapper ?? new PublicNarrationEventMapper();
  const contextBuilder =
    options.contextBuilder ?? new NarrationContextBuilder();
  const publicEvents = mapper.mapEvents(events);

  console.info("[ai] processing narration events", {
    matchId: match.id,
    domainEventCount: events.length,
    narrationEventCount: publicEvents.length,
  });

  if (publicEvents.length === 0) {
    console.warn("[ai] no public narration events were mapped", {
      matchId: match.id,
    });
  }

  for (const publicEvent of publicEvents) {
    const context = contextBuilder.build(match, publicEvent);
    const narration = await narrator.generateNarration(context).catch(() => null);
    const message = narration?.message?.trim() || buildFallbackMessage(context);
    const source = narration?.message?.trim() ? "provider" : "fallback";

    if (source === "fallback") {
      console.warn("[ai] using fallback narration", {
        matchId: match.id,
        eventKind: context.event.kind,
      });
    } else {
      console.info("[ai] using provider narration", {
        matchId: match.id,
        eventKind: context.event.kind,
      });
    }

    publisher.publish({ type: "GameMasterMessage", matchId: match.id, payload: buildPayload(context, message) });
  }
}
