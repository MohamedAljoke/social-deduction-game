export type Alignment = "hero" | "villain" | "neutral";
export type PhaseType = "discussion" | "action" | "voting" | "resolution";
export type MatchStatus = "lobby" | "started" | "finished";

export interface Player {
  id: string;
  name: string;
  templateId?: string;
  status: "alive" | "dead";
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
}

export interface Action {
  id: string;
  actorId: string;
  targetIds: string[];
  abilityId: string;
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
  };
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
}

export interface CreateMatchInput {
  name: string;
  config?: {
    showVotingTransparency?: boolean;
  };
}
