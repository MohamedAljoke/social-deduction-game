import { MatchResponse, MatchWinner } from "../../domain/entity/match";
import { NarrationContext, NarrationEventSummary, NarrationPlayerSummary, NarrationTemplateSummary } from "./AiNarrator";
import { PublicNarrationEvent } from "./PublicNarrationEvent";

export class NarrationContextBuilder {
  constructor(private readonly now: () => Date = () => new Date()) {}

  public build(
    match: MatchResponse,
    event: PublicNarrationEvent,
  ): NarrationContext {
    const templateNameById = new Map(
      match.templates.map((template) => [template.id, template.name]),
    );

    return {
      matchId: match.id,
      matchName: match.name,
      phase: match.phase,
      players: match.players.map((player): NarrationPlayerSummary => ({
        id: player.id,
        name: player.name,
        status: player.status,
        templateName: player.templateId
          ? templateNameById.get(player.templateId)
          : undefined,
      })),
      templates: match.templates.map(
        (template): NarrationTemplateSummary => ({
          id: template.id,
          name: template.name,
          alignment: template.alignment,
        }),
      ),
      event: this.buildEventSummary(match, event),
      winner: this.resolveWinner(match, event),
    };
  }

  private buildEventSummary(
    match: MatchResponse,
    event: PublicNarrationEvent,
  ): NarrationEventSummary {
    return {
      kind: event.kind,
      summary: this.formatEventSummary(match, event),
      occurredAt: this.now().toISOString(),
    };
  }

  private formatEventSummary(
    match: MatchResponse,
    event: PublicNarrationEvent,
  ): string {
    switch (event.kind) {
      case "start":
        return `The match started with ${event.playerCount} players.`;
      case "phase":
        return `The match advanced to the ${event.phase} phase.`;
      case "resolution":
        return event.eliminationCount === 1
          ? "One public elimination was resolved."
          : `${event.eliminationCount} public eliminations were resolved.`;
      case "elimination": {
        const player = match.players.find(
          (candidate) => candidate.id === event.playerId,
        );
        return player
          ? `${player.name} was eliminated during resolution.`
          : event.summary;
      }
      case "end":
        return this.formatWinnerSummary(event.winner);
    }
  }

  private formatWinnerSummary(winner: MatchWinner): string {
    if (winner.kind === "alignment") {
      return `The ${winner.alignment} alignment won the match.`;
    }

    const names = winner.templates.map((template) => template.templateName);
    return `${names.join(", ")} won the match.`;
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
