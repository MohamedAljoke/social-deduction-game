export type Alignment = "hero" | "villain" | "neutral";
export type PhaseType = "discussion" | "action" | "voting" | "resolution";
export type MatchStatus = "lobby" | "started" | "finished";
export type WinCondition = "team_parity" | "eliminate_alignment";

export interface WinConditionConfig {
  targetAlignment?: Alignment;
}

export type MatchWinner =
  | {
      kind: "alignment";
      alignment: Alignment;
    }
  | {
      kind: "templates";
      templates: Array<{
        templateId: string;
        templateName: string;
        alignment: Alignment;
      }>;
    };

export interface Player {
  id: string;
  name: string;
  templateId?: string;
  status: "alive" | "dead" | "eliminated";
}

export interface Ability {
  id: string;
  name?: string;
}

export interface Template {
  id: string;
  name: string;
  alignment: Alignment;
  abilities: Ability[];
  winCondition?: WinCondition;
  winConditionConfig?: WinConditionConfig | null;
}

export interface Action {
  id: string;
  actorId: string;
  targetIds: string[];
  effectType: string;
}

export interface Match {
  id: string;
  name: string;
  status: MatchStatus;
  phase: PhaseType;
  players: Player[];
  templates: Template[];
  actions: Action[];
  createdAt: string;
  votes?: Array<{ voterId: string; targetId: string | null }>;
  config: {
    showVotingTransparency: boolean;
    aiGameMasterEnabled: boolean;
  };
  winner?: MatchWinner | null;
  winnerAlignment?: Alignment | null;
  endedAt?: string | null;
}

export interface PlayerAssignment {
  playerId: string;
  templateId: string;
  alignment: string;
}

export interface TemplateInput {
  name?: string;
  alignment: Alignment;
  abilities: { id: string }[];
  winCondition?: WinCondition;
  winConditionConfig?: WinConditionConfig;
}

export interface CreateMatchInput {
  name: string;
  config?: {
    showVotingTransparency?: boolean;
    aiGameMasterEnabled?: boolean;
  };
}
