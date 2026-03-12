import { Card, Button, Avatar } from '../../shared/components';
import { ScreenContainer } from '../../shared/ui/ScreenContainer';
import { Logo } from '../../shared/ui/Logo';
import { t } from '@/infrastructure/i18n/translations';
import { useGame } from '../../context/GameContext';
import type { Alignment, MatchWinner } from '../../types/match';

const WINNER_THEME: Record<Alignment, { label: string; gradient: string }> = {
  hero: {
    label: t('end.heroesWin'),
    gradient: "linear-gradient(135deg, #4ade80, #22c55e)",
  },
  villain: {
    label: t('end.villainsWin'),
    gradient: "linear-gradient(135deg, #e94560, #be123c)",
  },
  neutral: {
    label: t('end.neutralsWin'),
    gradient: "linear-gradient(135deg, #fbbf24, #f59e0b)",
  },
};

export function EndScreen() {
  const { state, service } = useGame();
  const { match } = state;

  const handlePlayAgain = () => {
    service.leave();
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
      <div className="fade-in">
        <Logo title={t('end.gameOver')} subtitle={t('end.thankYou')} />
        
        <Card>
          <div 
            className="rounded-2xl p-6 text-center mb-6"
            style={{
              background:
                winnerTheme?.gradient ??
                "linear-gradient(135deg, #6b7280, #4b5563)",
            }}
          >
            <div className="text-sm uppercase tracking-wider opacity-90">{t('end.winner')}</div>
            <div className="text-[28px] font-bold mt-1">
              {winnerLabel}
            </div>
            {endedAtLabel && (
              <div className="text-xs mt-2 opacity-90">{t('end.endedAt')} {endedAtLabel}</div>
            )}
          </div>

          <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#a0a0b8' }}>{t('end.roleReveal')}</div>
          <div className="mb-6">
            {match.players.map((player, index) => {
              const template = match.templates.find(t => t.id === player.templateId);
              return (
                <div 
                  key={player.id} 
                  className="flex items-center gap-3 p-3 rounded-xl mb-2"
                  style={{ backgroundColor: '#1a1a2e' }}
                >
                  <Avatar name={player.name} index={index} />
                  <div className="flex-1">
                    <div className="font-medium">{player.name}</div>
                    <div
                      className="text-xs"
                      style={{
                        color: template?.alignment === 'hero' ? '#4ade80' :
                               template?.alignment === 'villain' ? '#e94560' : '#fbbf24'
                      }}
                    >
                      {template?.name || t('end.unknownTemplate')} - {template?.alignment || t('end.unknownAlignment')}
                    </div>
                  </div>
                  <div 
                    className="text-xs uppercase"
                    style={{ color: player.status === 'alive' ? '#4ade80' : '#e94560' }}
                  >
                    {player.status}
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={handlePlayAgain}>
            {t('end.playAgain')}
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
  if (winner?.kind === "alignment") {
    return WINNER_THEME[winner.alignment];
  }

  if (winner?.kind === "templates") {
    const primaryAlignment = winner.templates[0]?.alignment;
    return primaryAlignment ? WINNER_THEME[primaryAlignment] : null;
  }

  return winnerAlignment ? WINNER_THEME[winnerAlignment] : null;
}

function getWinnerLabel(
  winner: MatchWinner | null | undefined,
  winnerAlignment: Alignment | null | undefined,
) {
  if (winner?.kind === "alignment") {
    return WINNER_THEME[winner.alignment].label;
  }

  if (winner?.kind === "templates" && winner.templates.length > 0) {
    return winner.templates.map((template) => template.templateName).join(", ");
  }

  return winnerAlignment ? WINNER_THEME[winnerAlignment].label : t('end.gameEnded');
}
