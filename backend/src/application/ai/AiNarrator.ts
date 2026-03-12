import { MatchWinner } from "../../domain/entity/match";
import { PhaseType } from "../../domain/entity/phase";
import { Alignment } from "../../domain/entity/template";

export type NarrationKind =
  | "start"
  | "phase"
  | "resolution"
  | "elimination"
  | "end";

export interface NarrationPlayerSummary {
  id: string;
  name: string;
  status: "alive" | "dead" | "eliminated";
  templateName?: string;
}

export interface NarrationTemplateSummary {
  id: string;
  name: string;
  alignment: Alignment;
}

export interface NarrationEventSummary {
  kind: NarrationKind;
  summary: string;
  occurredAt: string;
}

export interface NarrationContext {
  matchId: string;
  matchName: string;
  phase: PhaseType;
  players: NarrationPlayerSummary[];
  templates: NarrationTemplateSummary[];
  event: NarrationEventSummary;
  winner?: MatchWinner | null;
}

export interface NarrationResult {
  kind: NarrationKind;
  message: string;
}

export interface AiNarratorConfig {
  provider: string;
  model: string;
  timeoutMs: number;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiNarrator {
  generateNarration(input: NarrationContext): Promise<NarrationResult | null>;
}
