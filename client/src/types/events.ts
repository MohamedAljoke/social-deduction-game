import type {
  Match,
  MatchWinner,
  Player,
  PlayerAssignment,
} from "./match";

export type ClientEvent =
  | { type: "join_match"; matchId: string; playerId: string }
  | { type: "leave_match"; matchId: string; playerId: string }
  | {
      type: "use_ability";
      matchId: string;
      actorId: string;
      EffectType: string;
      targetIds: string[];
    }
  | {
      type: "submit_vote";
      matchId: string;
      voterId: string;
      targetId: string | null;
    };

export type ServerEvent =
  | { type: "connected"; clientId: string }
  | { type: "player_joined"; matchId: string; player: Player }
  | { type: "player_left"; matchId: string; playerId: string }
  | { type: "players_synced"; matchId: string; players: Player[] }
  | {
      type: "match_started";
      matchId: string;
      playerAssignments: PlayerAssignment[];
    }
  | { type: "phase_changed"; matchId: string; phase: string }
  | {
      type: "action_submitted";
      matchId: string;
      actorId: string;
      EffectType: string;
      targetIds: string[];
    }
  | {
      type: "vote_submitted";
      matchId: string;
      voterId: string;
      targetId: string | null;
    }
  | { type: "match_updated"; matchId: string; state: Match }
  | { type: "player_killed"; matchId: string; playerId: string }
  | { type: "match_ended"; matchId: string; winner: MatchWinner }
  | {
      type: "investigate_result";
      matchId: string;
      actorId: string;
      targetId: string;
      alignment: string;
    }
  | { type: "error"; code: string; message: string };
