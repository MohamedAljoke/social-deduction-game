import { PlayerResponse } from "../entity/player";
import { PhaseType } from "../entity/phase";
import { Alignment } from "../entity/template";
import type { MatchWinner } from "../entity/match";
import { EffectResult } from "../services/resolution";

export interface MatchPlayerAssignment {
  playerId: string;
  templateId: string;
  alignment: Alignment;
}

export type MatchDomainEvent =
  | {
      type: "PlayerJoined";
      matchId: string;
      player: PlayerResponse;
    }
  | {
      type: "PlayerLeft";
      matchId: string;
      playerId: string;
    }
  | {
      type: "MatchStarted";
      matchId: string;
      playerAssignments: MatchPlayerAssignment[];
    }
  | {
      type: "VoteSubmitted";
      matchId: string;
      voterId: string;
      targetId: string | null;
    }
  | {
      type: "PhaseAdvanced";
      matchId: string;
      phase: PhaseType;
    }
  | {
      type: "ActionsResolved";
      matchId: string;
      effects: EffectResult[];
    }
  | {
      type: "MatchEnded";
      matchId: string;
      winner: MatchWinner;
    }
  | {
      type: "MatchRematched";
      matchId: string;
    };
