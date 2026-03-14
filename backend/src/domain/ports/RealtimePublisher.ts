import { MatchResponse, MatchWinner } from "../entity/match";
import { PhaseType } from "../entity/phase";
import { PlayerResponse } from "../entity/player";
import { MatchPlayerAssignment } from "../events/match-events";
import { EffectResult } from "../services/resolution";

export interface GameMasterMessagePayload {
  messageId: string;
  kind: "start" | "phase" | "resolution" | "elimination" | "end";
  message: string;
  createdAt: string;
}

export type RealtimeEvent =
  | { type: "PlayerJoined"; matchId: string; player: PlayerResponse }
  | { type: "PlayerLeft"; matchId: string; playerId: string }
  | { type: "MatchStarted"; matchId: string; playerAssignments: MatchPlayerAssignment[] }
  | { type: "VoteSubmitted"; matchId: string; voterId: string; targetId: string | null }
  | { type: "PhaseChanged"; matchId: string; phase: PhaseType }
  | { type: "EffectResolved"; matchId: string; effect: EffectResult }
  | { type: "MatchEnded"; matchId: string; winner: MatchWinner }
  | { type: "MatchSnapshotUpdated"; matchId: string; match: MatchResponse }
  | { type: "GameMasterMessage"; matchId: string; payload: GameMasterMessagePayload };

export interface RealtimePublisher {
  publish(event: RealtimeEvent): void;
}
