import { MatchDomainEvent } from "../domain/events/match-events";
import { RealtimePublisher } from "../domain/ports/RealtimePublisher";
import { MatchResponse } from "../domain/entity/match";

type MatchEndedEvent = Extract<MatchDomainEvent, { type: "MatchEnded" }>;

export function publishMatchEvents(
  events: MatchDomainEvent[],
  result: MatchResponse,
  publisher: RealtimePublisher,
): void {
  const deferredEvents: MatchEndedEvent[] = [];

  for (const event of events) {
    switch (event.type) {
      case "PlayerJoined":
        publisher.playerJoined(event.matchId, event.player);
        break;
      case "PlayerLeft":
        publisher.playerLeft(event.matchId, event.playerId);
        break;
      case "MatchStarted":
        publisher.matchStarted(event.matchId, {
          playerAssignments: event.playerAssignments,
        });
        break;
      case "VoteSubmitted":
        publisher.voteSubmitted(event.matchId, event.voterId, event.targetId);
        break;
      case "PhaseAdvanced":
        publisher.phaseChanged(event.matchId, event.phase);
        break;
      case "ActionsResolved":
        for (const effect of event.effects) {
          publisher.effectResolved(event.matchId, effect);
        }
        break;
      case "MatchEnded":
        deferredEvents.push(event);
        break;
    }
  }

  if (events.length > 0) {
    publisher.matchUpdated(result.id, result);
  }

  for (const event of deferredEvents) {
    publisher.matchEnded(event.matchId, event.winner);
  }
}
