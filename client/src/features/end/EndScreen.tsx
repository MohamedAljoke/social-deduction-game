import { Card, Button, Avatar } from '../../shared/components';
import { ScreenContainer } from '../../shared/ui/ScreenContainer';
import { Logo } from '../../shared/ui/Logo';
import { useGame } from '../../context/GameContext';
import type { Alignment } from '../../types/match';

const WINNER_THEME: Record<Alignment, { label: string; gradient: string }> = {
  hero: {
    label: "Heroes win",
    gradient: "linear-gradient(135deg, #4ade80, #22c55e)",
  },
  villain: {
    label: "Villains win",
    gradient: "linear-gradient(135deg, #e94560, #be123c)",
  },
  neutral: {
    label: "Neutrals win",
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

  const winnerTheme = match.winnerAlignment
    ? WINNER_THEME[match.winnerAlignment]
    : null;
  const endedAtLabel = match.endedAt
    ? new Date(match.endedAt).toLocaleString()
    : null;

  return (
    <ScreenContainer>
      <div className="fade-in">
        <Logo title="Game Over" subtitle="Thanks for playing!" />
        
        <Card>
          <div 
            className="rounded-2xl p-6 text-center mb-6"
            style={{
              background:
                winnerTheme?.gradient ??
                "linear-gradient(135deg, #6b7280, #4b5563)",
            }}
          >
            <div className="text-sm uppercase tracking-wider opacity-90">Winner</div>
            <div className="text-[28px] font-bold mt-1">
              {winnerTheme?.label ?? "Game Ended"}
            </div>
            {endedAtLabel && (
              <div className="text-xs mt-2 opacity-90">Ended at {endedAtLabel}</div>
            )}
          </div>

          <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#a0a0b8' }}>Role Reveal</div>
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
                      {template?.name || 'Unknown'} - {template?.alignment || 'unknown'}
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
            Play Again
          </Button>
        </Card>
      </div>
    </ScreenContainer>
  );
}
