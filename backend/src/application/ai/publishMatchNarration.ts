import { MatchResponse, MatchWinner } from "../../domain/entity/match";
import { MatchDomainEvent } from "../../domain/events/match-events";
import {
  GameMasterMessagePayload,
  RealtimePublisher,
} from "../../domain/ports/RealtimePublisher";
import { AiNarrator, NarrationContext } from "./AiNarrator";
import { NarrationContextBuilder } from "./NarrationContextBuilder";
import { PublicNarrationEventMapper } from "./PublicNarrationEvent";

function formatWinnerText(winner: MatchWinner | null | undefined): string {
  if (!winner) {
    return "the board";
  }

  if (winner.kind === "alignment") {
    return `the ${winner.alignment} alignment`;
  }

  return winner.templates.map((template) => template.templateName).join(", ");
}

function buildFallbackMessage(context: NarrationContext): string {
  switch (context.event.kind) {
    case "start": {
      const templateNames = context.templates.map((template) => template.name);
      const cast =
        templateNames.length > 0
          ? ` The cast circles around ${templateNames.join(", ")}.`
          : "";
      return `The game master is sleeping, but ${context.matchName} has begun.${cast}`;
    }
    case "phase":
      return `The game master is sleeping, but the story moves into ${context.phase}.`;
    case "resolution":
      return "The game master is sleeping, but resolution still carves its mark across the table.";
    case "elimination": {
      const playerName = context.event.summary.split(" was ")[0];
      const eliminatedPlayer = context.players.find(
        (player) => player.name === playerName,
      );

      if (eliminatedPlayer?.templateName) {
        return `The game master is sleeping, but ${eliminatedPlayer.name} the ${eliminatedPlayer.templateName} has fallen.`;
      }

      if (eliminatedPlayer) {
        return `The game master is sleeping, but ${eliminatedPlayer.name} has fallen.`;
      }

      return "The game master is sleeping, but someone has fallen from the story.";
    }
    case "end":
      return `The game master is sleeping, but ${formatWinnerText(context.winner)} claims the final chapter.`;
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
    return;
  }

  const mapper = options.mapper ?? new PublicNarrationEventMapper();
  const contextBuilder =
    options.contextBuilder ?? new NarrationContextBuilder();

  for (const publicEvent of mapper.mapEvents(events)) {
    const context = contextBuilder.build(match, publicEvent);
    const narration = await narrator.generateNarration(context).catch(() => null);
    const message = narration?.message?.trim() || buildFallbackMessage(context);

    publisher.gameMasterMessage(match.id, buildPayload(context, message));
  }
}
