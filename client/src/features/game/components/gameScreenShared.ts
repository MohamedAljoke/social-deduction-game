import type { Match } from "../../../types/match";

/**
 * Inline style for panel containers.
 * References CSS vars from index.css @theme so color changes cascade.
 */
export const PANEL_STYLE = {
  backgroundColor: "var(--color-surface-card)",
  border: "2px solid var(--color-rim)",
} as const;

/**
 * CSS color string for secondary/muted text used in inline styles.
 * Where possible prefer the Tailwind class `text-ink-secondary` instead.
 */
export const MUTED_TEXT = "var(--color-ink-secondary)";

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

/**
 * Returns a Tailwind text-color class for an alignment value.
 * Use as: <span className={getAlignmentClass(alignment)}>
 */
export function getAlignmentClass(alignment: string): string {
  if (alignment === "hero") return "text-success";
  if (alignment === "villain") return "text-danger";
  return "text-warning";
}

/**
 * Returns a CSS var color string for use in inline style props.
 * Prefer getAlignmentClass() + className where possible.
 */
export function getAlignmentColor(alignment: string): string {
  if (alignment === "hero") return "var(--color-success)";
  if (alignment === "villain") return "var(--color-danger)";
  return "var(--color-warning)";
}
