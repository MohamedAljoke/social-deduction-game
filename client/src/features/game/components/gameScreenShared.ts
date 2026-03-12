import type { Match } from "../../../types/match";

export const PANEL_STYLE = {
  backgroundColor: "#16213e",
  border: "2px solid #2a2a4a",
} as const;

export const MUTED_TEXT = "#a0a0b8";

export interface InvestigateBannerData {
  alignment: string;
  targetName: string;
}

export interface GameLogEntry {
  actorName: string;
  targetNames: string;
  verb: string;
}

export interface GameMasterFeedEntry {
  messageId: string;
  kind: "start" | "phase" | "resolution" | "elimination" | "end";
  message: string;
  createdAt: string;
}

export function getInvestigateBannerData(
  match: Match | null,
  investigateResult: { targetId: string; alignment: string } | null,
): InvestigateBannerData | null {
  if (!investigateResult) return null;

  return {
    alignment: investigateResult.alignment,
    targetName:
      match?.players.find((player) => player.id === investigateResult.targetId)
        ?.name ?? investigateResult.targetId,
  };
}

export function getAlignmentColor(alignment: string): string {
  if (alignment === "hero") return "#4ade80";
  if (alignment === "villain") return "#e94560";
  return "#fbbf24";
}
