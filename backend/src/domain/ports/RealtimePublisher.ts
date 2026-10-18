import { MatchResponse, MatchWinner } from "../entity/match";
import { PhaseType } from "../entity/phase";
import { PlayerResponse } from "../entity/player";
import { Alignment } from "../entity/template";

export interface GameMasterMessagePayload {
  messageId: string;
  kind: "start" | "phase" | "resolution" | "elimination" | "end";
  message: string;
  createdAt: string;
}

export type RealtimeEvent =
  | { type: "PlayerJoined"; matchId: string; player: PlayerResponse }
  | { type: "PlayerLeft"; matchId: string; playerId: string }
  | { type: "MatchStarted"; matchId: string }
  | { type: "VoteSubmitted"; matchId: string; voterId: string; targetId: string | null }
  | { type: "PhaseChanged"; matchId: string; phase: PhaseType }
  | { type: "PlayerKilled"; matchId: string; playerId: string }
  | { type: "InvestigateResult"; matchId: string; actorId: string; targetId: string; alignment: Alignment }
  | { type: "MatchEnded"; matchId: string; winner: MatchWinner }
  | {
      type: "MatchSnapshotUpdated";
      matchId: string;
      publicView: MatchResponse;
      viewsByPlayerId: Record<string, MatchResponse>;
    }
  | { type: "GameMasterMessage"; matchId: string; payload: GameMasterMessagePayload };

export interface RealtimePublisher {
  publish(event: RealtimeEvent): void;
}
