import type { Template } from "../../../types/match";
import { t } from "@/infrastructure/i18n/translations";
import {
  getAlignmentClass,
  type InvestigateBannerData,
} from "./gameScreenShared";

export function RoleCard({ template }: { template: Template }) {
  return (
    <div className="rounded-2xl p-4 mb-5 text-center bg-surface-card border-2 border-brand">
      <div className="text-xs uppercase tracking-widest text-ink-muted">
        {t('game.yourRole')}
      </div>
      <div className="text-xl font-bold my-1 text-brand">
        {template.name}
      </div>
      <div className={`text-xs uppercase ${getAlignmentClass(template.alignment)}`}>
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
    <div className="rounded-2xl p-5 text-center mb-5 bg-gradient-brand">
      <div className="text-2xl font-bold uppercase tracking-wider text-ink">{title}</div>
      <div className="text-sm opacity-90 mt-1 text-ink">{description}</div>
    </div>
  );
}

export function InvestigationBanner({ result }: { result: InvestigateBannerData }) {
  return (
    <div
      data-testid="investigate-result-banner"
      className="rounded-2xl p-4 mb-5 text-center border-2 border-success"
      style={{ backgroundColor: "rgba(16,185,129,0.08)" }}
    >
      <div className="text-xs uppercase tracking-widest mb-1 text-success">
        {t('game.investigationResult')}
      </div>
      <div className="text-base font-semibold text-ink">
        {result.targetName} {t('game.investigationConnector')}{" "}
        <span className={`font-bold ${getAlignmentClass(result.alignment)}`}>
          {result.alignment}
        </span>
      </div>
    </div>
  );
}

export function EliminatedBanner() {
  return (
    <div className="rounded-2xl p-4 mb-5 text-center bg-surface-card border-2 border-brand">
      <div className="text-lg font-semibold text-brand-dim">
        {t('game.eliminated')}
      </div>
      <div className="text-sm mt-1 text-ink-secondary">
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
        className="py-2 px-6 border-none rounded-lg text-ink text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-ink-muted"
        disabled={isAdvancing}
        onClick={onAdvance}
      >
        {isAdvancing ? t('game.advancing') : t('game.nextPhase')}
      </button>
    </div>
  );
}
