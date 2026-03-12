import { MatchResponse, MatchWinner } from "../../domain/entity/match";
import {
  NarrationContext,
  NarrationEventSummary,
  NarrationPlayerSummary,
  NarrationTemplateSummary,
} from "./AiNarrator";
import { PublicNarrationEvent } from "./PublicNarrationEvent";

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

export class NarrationContextBuilder {
  constructor(private readonly now: () => Date = () => new Date()) {}

  public build(
    match: MatchResponse,
    event: PublicNarrationEvent,
  ): NarrationContext {
    return {
      matchId: match.id,
      matchName: match.name,
      phase: match.phase,
      players: match.players.map(
        (player): NarrationPlayerSummary => ({
          status: player.status,
          templateName: player.templateId
            ? match.templates.find(
                (template) => template.id === player.templateId,
              )?.name
            : undefined,
        }),
      ),
      templates: match.templates.map(
        (template): NarrationTemplateSummary => ({
          id: template.id,
          name: template.name,
          alignment: template.alignment,
          abilities: template.abilities.map((ability) => ability.id),
        }),
      ),
      event: this.buildEventSummary(event),
      winner: this.resolveWinner(match, event),
    };
  }

  private buildEventSummary(
    event: PublicNarrationEvent,
  ): NarrationEventSummary {
    return {
      kind: event.kind,
      summary: this.formatEventSummary(event),
      occurredAt: this.now().toISOString(),
    };
  }

  private formatEventSummary(event: PublicNarrationEvent): string {
    switch (event.kind) {
      case "start":
        return `A partida comecou com ${event.playerCount} jogadores.`;
      case "phase":
        return `A partida avancou para a fase de ${formatPhase(event.phase)}.`;
      case "resolution":
        return event.eliminationCount === 1
          ? "Uma eliminacao publica foi resolvida."
          : `${event.eliminationCount} eliminacoes publicas foram resolvidas.`;
      case "elimination": {
        return event.summary;
      }
      case "end":
        return this.formatWinnerSummary(event.winner);
    }
  }

  private formatWinnerSummary(winner: MatchWinner): string {
    if (winner.kind === "alignment") {
      return `O alinhamento ${winner.alignment} venceu a partida.`;
    }

    const names = winner.templates.map((template) => template.templateName);
    return `${names.join(", ")} venceu a partida.`;
  }

  private resolveWinner(
    match: MatchResponse,
    event: PublicNarrationEvent,
  ): MatchWinner | null | undefined {
    if (event.kind === "end") {
      return event.winner;
    }

    return match.winner;
  }
}
