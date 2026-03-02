export interface Player {
  id: string;
  name: string;
  templateId?: string;
  status: "alive" | "dead";
}

export interface Template {
  id: string;
  name: string;
  alignment: "hero" | "villain" | "neutral";
  abilities: Ability[];
}

export interface Ability {
  id: string;
}

export interface Action {
  id: string;
  actorId: string;
  targetIds: string[];
  abilityId: string;
}

export type PhaseType = "discussion" | "action" | "voting" | "resolution";

export type MatchStatus = "LOBBY" | "IN_PROGRESS" | "FINISHED";

export interface Match {
  id: string;
  name: string;
  status: MatchStatus;
  phase: PhaseType;
  players: Player[];
  templates: Template[];
  actions: Action[];
  createdAt: string;
}

export interface TemplateInput {
  name?: string;
  alignment: "hero" | "villain" | "neutral";
  abilities: { id: string }[];
}

export interface JoinMatchBody {
  name: string;
}

export interface CreateMatchBody {
  name: string;
}

export interface UseAbilityBody {
  actorId: string;
  abilityId: string;
  targetIds: string[];
}

export interface PlayerAssignment {
  playerId: string;
  templateId: string;
  alignment: string;
}
