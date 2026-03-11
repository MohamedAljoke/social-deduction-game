import { Alignment } from "../entity/template";
import { EffectResult } from "../services/resolution";

export type MatchDomainEvent =
  | {
      type: "PlayerJoined";
      matchId: string;
      player: unknown;
    }
  | {
      type: "PlayerLeft";
      matchId: string;
      playerId: string;
    }
  | {
      type: "MatchStarted";
      matchId: string;
      playerAssignments: { playerId: string; templateId: string; alignment: string }[];
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
      phase: string;
    }
  | {
      type: "ActionsResolved";
      matchId: string;
      effects: EffectResult[];
    }
  | {
      type: "MatchEnded";
      matchId: string;
      winner: Alignment;
    };
