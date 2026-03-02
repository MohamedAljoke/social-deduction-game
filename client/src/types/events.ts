export type ClientEvent =
  | { type: "join_match"; matchId: string; playerId: string }
  | { type: "leave_match"; matchId: string; playerId: string }
  | {
      type: "use_ability";
      matchId: string;
      actorId: string;
      abilityId: string;
      targetIds: string[];
    }
  | { type: "submit_vote"; matchId: string; voterId: string; targetId: string };

export type ServerEvent =
  | { type: "connected"; clientId: string }
  | { type: "player_joined"; matchId: string; player: unknown }
  | { type: "player_left"; matchId: string; playerId: string }
  | {
      type: "match_started";
      matchId: string;
      playerAssignments: {
        playerId: string;
        templateId: string;
        alignment: string;
      }[];
    }
  | { type: "phase_changed"; matchId: string; phase: string }
  | {
      type: "action_submitted";
      matchId: string;
      actorId: string;
      abilityId: string;
      targetIds: string[];
    }
  | {
      type: "vote_submitted";
      matchId: string;
      voterId: string;
      targetId: string;
    }
  | { type: "match_updated"; matchId: string; state: unknown }
  | { type: "player_killed"; matchId: string; playerId: string }
  | { type: "match_ended"; matchId: string; winner: string }
  | { type: "error"; code: string; message: string };
