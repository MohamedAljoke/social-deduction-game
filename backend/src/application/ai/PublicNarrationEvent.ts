import { MatchWinner } from "../../domain/entity/match";
import { PhaseType } from "../../domain/entity/phase";
import { MatchDomainEvent } from "../../domain/events/match-events";
import { EffectResult } from "../../domain/services/resolution";
import { NarrationKind } from "./AiNarrator";

type MatchStartedEvent = Extract<MatchDomainEvent, { type: "MatchStarted" }>;
type PhaseAdvancedEvent = Extract<MatchDomainEvent, { type: "PhaseAdvanced" }>;
type ActionsResolvedEvent = Extract<MatchDomainEvent, { type: "ActionsResolved" }>;
type MatchEndedEvent = Extract<MatchDomainEvent, { type: "MatchEnded" }>;

export type PublicNarrationEvent =
  | {
      kind: Extract<NarrationKind, "start">;
      matchId: string;
      playerCount: number;
      summary: string;
    }
  | {
      kind: Extract<NarrationKind, "phase">;
      matchId: string;
      phase: PhaseType;
      summary: string;
    }
  | {
      kind: Extract<NarrationKind, "resolution">;
      matchId: string;
      eliminationCount: number;
      summary: string;
    }
  | {
      kind: Extract<NarrationKind, "elimination">;
      matchId: string;
      playerId: string;
      cause: "kill";
      summary: string;
    }
  | {
      kind: Extract<NarrationKind, "end">;
      matchId: string;
      winner: MatchWinner;
      summary: string;
    };

export class PublicNarrationEventMapper {
  public mapEvents(events: MatchDomainEvent[]): PublicNarrationEvent[] {
    return events.flatMap((event) => this.mapEvent(event));
  }

  public mapEvent(event: MatchDomainEvent): PublicNarrationEvent[] {
    switch (event.type) {
      case "MatchStarted":
        return [this.mapMatchStarted(event)];
      case "PhaseAdvanced":
        return [this.mapPhaseAdvanced(event)];
      case "ActionsResolved":
        return this.mapActionsResolved(event);
      case "MatchEnded":
        return [this.mapMatchEnded(event)];
      case "PlayerJoined":
      case "PlayerLeft":
      case "VoteSubmitted":
      case "MatchRematched":
        return [];
    }
  }

  private mapMatchStarted(event: MatchStartedEvent): PublicNarrationEvent {
    return {
      kind: "start",
      matchId: event.matchId,
      playerCount: event.playerAssignments.length,
      summary: "The match has started.",
    };
  }

  private mapPhaseAdvanced(event: PhaseAdvancedEvent): PublicNarrationEvent {
    return {
      kind: "phase",
      matchId: event.matchId,
      phase: event.phase,
      summary: `The match advanced to the ${event.phase} phase.`,
    };
  }

  private mapActionsResolved(
    event: ActionsResolvedEvent,
  ): PublicNarrationEvent[] {
    const eliminatedPlayerIds = event.effects
      .filter((effect) => this.isPublicElimination(effect))
      .map((effect) => effect.targetIds[0])
      .filter((playerId): playerId is string => Boolean(playerId));

    if (eliminatedPlayerIds.length === 0) {
      return [];
    }

    return [
      {
        kind: "resolution",
        matchId: event.matchId,
        eliminationCount: eliminatedPlayerIds.length,
        summary:
          eliminatedPlayerIds.length === 1
            ? "A public elimination was resolved."
            : `${eliminatedPlayerIds.length} public eliminations were resolved.`,
      },
      ...eliminatedPlayerIds.map((playerId) => ({
        kind: "elimination" as const,
        matchId: event.matchId,
        playerId,
        cause: "kill" as const,
        summary: "A player was eliminated during resolution.",
      })),
    ];
  }

  private mapMatchEnded(event: MatchEndedEvent): PublicNarrationEvent {
    return {
      kind: "end",
      matchId: event.matchId,
      winner: event.winner,
      summary: "The match has ended.",
    };
  }

  private isPublicElimination(effect: EffectResult): boolean {
    return effect.type === "kill" && effect.targetIds.length > 0;
  }
}
