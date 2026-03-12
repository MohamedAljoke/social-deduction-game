import type { Template } from "../../../types/match";
import { t } from "@/infrastructure/i18n/translations";
import {
  getAlignmentColor,
  type InvestigateBannerData,
  MUTED_TEXT,
} from "./gameScreenShared";

export function RoleCard({ template }: { template: Template }) {
  return (
    <div
      className="rounded-2xl p-4 mb-5 text-center"
      style={{ backgroundColor: "#16213e", border: "2px solid #e94560" }}
    >
      <div
        className="text-xs uppercase tracking-widest"
        style={{ color: "#6b6b80" }}
      >
        {t('game.yourRole')}
      </div>
      <div className="text-xl font-bold my-1" style={{ color: "#e94560" }}>
        {template.name}
      </div>
      <div
        className="text-xs uppercase"
        style={{ color: getAlignmentColor(template.alignment) }}
      >
        {template.alignment}
      </div>
    </div>
  );
}

export function PhaseBanner({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 text-center mb-5"
      style={{ background: "linear-gradient(135deg, #e94560, #ff6b6b)" }}
    >
      <div className="text-2xl font-bold uppercase tracking-wider">{title}</div>
      <div className="text-sm opacity-90 mt-1">{description}</div>
    </div>
  );
}

export function InvestigationBanner({
  result,
}: {
  result: InvestigateBannerData;
}) {
  return (
    <div
      data-testid="investigate-result-banner"
      className="rounded-2xl p-4 mb-5 text-center"
      style={{ backgroundColor: "#1a2e1a", border: "2px solid #4ade80" }}
    >
      <div
        className="text-xs uppercase tracking-widest mb-1"
        style={{ color: "#4ade80" }}
      >
        {t('game.investigationResult')}
      </div>
      <div className="text-base font-semibold" style={{ color: "#ffffff" }}>
        {result.targetName} {t('game.investigationConnector')}{" "}
        <span
          style={{
            color: getAlignmentColor(result.alignment),
            fontWeight: 700,
          }}
        >
          {result.alignment}
        </span>
      </div>
    </div>
  );
}

export function EliminatedBanner() {
  return (
    <div
      className="rounded-2xl p-4 mb-5 text-center"
      style={{ backgroundColor: "#1a1a2e", border: "2px solid #e94560" }}
    >
      <div className="text-lg font-semibold" style={{ color: "#e94560" }}>
        {t('game.eliminated')}
      </div>
      <div className="text-sm mt-1" style={{ color: MUTED_TEXT }}>
        {t('game.eliminatedMessage')}
      </div>
    </div>
  );
}

export function NextPhaseButton({
  isAdvancing,
  onAdvance,
}: {
  isAdvancing: boolean;
  onAdvance: () => void | Promise<void>;
}) {
  return (
    <div className="mb-5 text-center">
      <button
        className="py-2 px-6 border-none rounded-lg text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#6b6b80" }}
        disabled={isAdvancing}
        onClick={onAdvance}
      >
        {isAdvancing ? t('game.advancing') : t('game.nextPhase')}
      </button>
    </div>
  );
}
