import { useState } from "react";
import { Card, Button, Avatar } from '../../shared/components';
import { ScreenContainer } from '../../shared/ui/ScreenContainer';
import { Logo } from '../../shared/ui/Logo';
import { t } from '@/infrastructure/i18n/translations';
import { useGame } from '../../context/GameContext';
import { getAlignmentClass } from '../game/components/gameScreenShared';
import type { Alignment, MatchWinner } from '../../types/match';

// Gradient CSS classes are defined in index.css and reference @theme vars
const WINNER_THEME: Record<Alignment, { label: string; gradientClass: string }> = {
  hero:    { label: t('end.heroesWin'),   gradientClass: "bg-gradient-hero" },
  villain: { label: t('end.villainsWin'), gradientClass: "bg-gradient-villain" },
  neutral: { label: t('end.neutralsWin'), gradientClass: "bg-gradient-neutral" },
};

export function EndScreen() {
  const { state, service } = useGame();
  const { match } = state;
  const [loading, setLoading] = useState(false);

  const handlePlayAgain = async () => {
    if (!match) return;
    setLoading(true);
    try {
      await service.rematch(match.id);
    } catch {
      alert(t('end.errorRematch'));
    } finally {
      setLoading(false);
    }
  };

  if (!match) {
    return <div>Loading...</div>;
  }

  const winnerTheme = getWinnerTheme(match.winner, match.winnerAlignment);
  const winnerLabel = getWinnerLabel(match.winner, match.winnerAlignment);
  const endedAtLabel = match.endedAt
    ? new Date(match.endedAt).toLocaleString()
    : null;

  return (
    <ScreenContainer>
      <div className="fade-in w-full">
        <Logo title={t('end.gameOver')} subtitle={t('end.thankYou')} />

        <Card>
          {/* Winner banner */}
          <div
            className={`rounded-2xl p-6 text-center mb-6 slide-up ${winnerTheme?.gradientClass ?? "bg-gradient-unknown"}`}
          >
            <div className="text-sm uppercase tracking-wider opacity-90 text-ink">{t('end.winner')}</div>
            <div className="text-[28px] font-bold mt-1 text-ink">{winnerLabel}</div>
            {endedAtLabel && (
              <div className="text-xs mt-2 opacity-90 text-ink">{t('end.endedAt')} {endedAtLabel}</div>
            )}
          </div>

          {/* Role reveal */}
          <div className="text-sm font-semibold uppercase tracking-wider mb-4 text-ink-secondary">
            {t('end.roleReveal')}
          </div>
          <div className="mb-6">
            {match.players.map((player, index) => {
              const template = match.templates.find(tmpl => tmpl.id === player.templateId);
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-xl mb-2 bg-surface-raised slide-up stagger-${Math.min(index + 1, 8)}`}
                >
                  <Avatar name={player.name} index={index} />
                  <div className="flex-1">
                    <div className="font-medium text-ink">{player.name}</div>
                    <div className={`text-xs ${getAlignmentClass(template?.alignment ?? "neutral")}`}>
                      {template?.name || t('end.unknownTemplate')} - {template?.alignment || t('end.unknownAlignment')}
                    </div>
                  </div>
                  <div className={`text-xs uppercase ${player.status === 'alive' ? 'text-success' : 'text-brand-dim'}`}>
                    {player.status}
                  </div>
                </div>
              );
            })}
          </div>

          {state.isHost ? (
            <Button onClick={() => void handlePlayAgain()} loading={loading}>
              {loading ? t('end.startingRematch') : t('end.playAgain')}
            </Button>
          ) : (
            <div className="rounded-xl px-4 py-3 text-sm text-center mb-3 bg-surface-raised text-ink-secondary">
              {t('end.waitingForHostRematch')}
            </div>
          )}
          <Button
            onClick={() => service.leave()}
            variant="secondary"
            className={state.isHost ? "mt-3" : ""}
          >
            {t('end.leaveGame')}
          </Button>
        </Card>
      </div>
    </ScreenContainer>
  );
}

function getWinnerTheme(
  winner: MatchWinner | null | undefined,
  winnerAlignment: Alignment | null | undefined,
) {
  if (winner?.kind === "alignment") return WINNER_THEME[winner.alignment];
  if (winner?.kind === "templates") {
    const primary = winner.templates[0]?.alignment;
    return primary ? WINNER_THEME[primary] : null;
  }
  return winnerAlignment ? WINNER_THEME[winnerAlignment] : null;
}

function getWinnerLabel(
  winner: MatchWinner | null | undefined,
  winnerAlignment: Alignment | null | undefined,
) {
  if (winner?.kind === "alignment") return WINNER_THEME[winner.alignment].label;
  if (winner?.kind === "templates" && winner.templates.length > 0) {
    return winner.templates.map((tmpl) => tmpl.templateName).join(", ");
  }
  return winnerAlignment ? WINNER_THEME[winnerAlignment].label : t('end.gameEnded');
}
