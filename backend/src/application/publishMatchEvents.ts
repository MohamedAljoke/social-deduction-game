import { MatchResponse } from "../domain/entity/match";
import { Alignment } from "../domain/entity/template";
import { MatchDomainEvent } from "../domain/events/match-events";
import { RealtimeEvent, RealtimePublisher } from "../domain/ports/RealtimePublisher";

export function publishMatchEvents(
  events: MatchDomainEvent[],
  result: MatchResponse,
  publisher: RealtimePublisher,
): void {
  const realtimeEvents: RealtimeEvent[] = [];
  const deferredEvents: Array<Extract<RealtimeEvent, { type: "MatchEnded" }>> = [];

  for (const event of events) {
    switch (event.type) {
      case "PlayerJoined":
        realtimeEvents.push({ type: "PlayerJoined", matchId: event.matchId, player: event.player });
        break;
      case "PlayerLeft":
        realtimeEvents.push({ type: "PlayerLeft", matchId: event.matchId, playerId: event.playerId });
        break;
      case "MatchStarted":
        realtimeEvents.push({ type: "MatchStarted", matchId: event.matchId, playerAssignments: event.playerAssignments });
        break;
      case "VoteSubmitted":
        realtimeEvents.push({ type: "VoteSubmitted", matchId: event.matchId, voterId: event.voterId, targetId: event.targetId });
        break;
      case "PhaseAdvanced":
        realtimeEvents.push({ type: "PhaseChanged", matchId: event.matchId, phase: event.phase });
        break;
      case "ActionsResolved":
        for (const effect of event.effects) {
          switch (effect.type) {
            case "kill":
              realtimeEvents.push({
                type: "PlayerKilled",
                matchId: event.matchId,
                playerId: effect.targetIds[0],
              });
              break;
            case "investigate": {
              const alignment = effect.data?.["alignment"] as Alignment | undefined;
              if (alignment) {
                realtimeEvents.push({
                  type: "InvestigateResult",
                  matchId: event.matchId,
                  actorId: effect.actorId,
                  targetId: effect.targetIds[0],
                  alignment,
                });
              }
              break;
            }
            // kill_blocked, protect, roleblock, vote_shield: intentionally not published to clients
          }
        }
        break;
      case "MatchEnded":
        deferredEvents.push({ type: "MatchEnded", matchId: event.matchId, winner: event.winner });
        break;
      case "MatchRematched":
        break;
    }
  }

  if (events.length > 0) {
    realtimeEvents.push({ type: "MatchSnapshotUpdated", matchId: result.id, match: result });
  }

  for (const re of realtimeEvents) {
    publisher.publish(re);
  }

  for (const re of deferredEvents) {
    publisher.publish(re);
  }
}
