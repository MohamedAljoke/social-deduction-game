import { useNavigate } from 'react-router-dom';
import { Card, Button, Avatar } from '../../shared/components';
import { ScreenContainer } from '../../shared/ui/ScreenContainer';
import { Logo } from '../../shared/ui/Logo';
import { useGame } from '../../context/GameContext';

export function EndScreen() {
  const navigate = useNavigate();
  const { state } = useGame();
  const { match } = state;

  const handlePlayAgain = () => {
    navigate('/');
  };

  if (!match) {
    return <div>Loading...</div>;
  }

  return (
    <ScreenContainer>
      <div className="fade-in">
        <Logo title="Game Over" subtitle="Thanks for playing!" />
        
        <Card>
          <div 
            className="rounded-2xl p-6 text-center mb-6"
            style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)' }}
          >
            <div className="text-sm uppercase tracking-wider opacity-90">Winner</div>
            <div className="text-[28px] font-bold mt-1">Game Ended!</div>
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
