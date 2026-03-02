import { useNavigate } from 'react-router-dom';
import { Card, Button, Avatar } from '../../shared/components';
import { ScreenContainer } from '../../shared/ui/ScreenContainer';
import { Logo } from '../../shared/ui/Logo';
import { useGame } from '../session/context/GameContext';

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
          <div className="bg-gradient-to-br from-success to-green-500 rounded-2xl p-6 text-center mb-6">
            <div className="text-sm uppercase tracking-wider opacity-90">Winner</div>
            <div className="text-[28px] font-bold mt-1">Game Ended!</div>
          </div>

          <div className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Role Reveal</div>
          <div className="mb-6">
            {match.players.map((player, index) => {
              const template = match.templates.find(t => t.id === player.templateId);
              return (
                <div key={player.id} className="flex items-center gap-3 p-3 bg-bg-secondary rounded-xl mb-2">
                  <Avatar name={player.name} index={index} />
                  <div className="flex-1">
                    <div className="font-medium">{player.name}</div>
                    <div className={`text-xs ${
                      template?.alignment === 'hero' ? 'text-success' : 
                      template?.alignment === 'villain' ? 'text-accent-primary' : 'text-warning'
                    }`}>
                      {template?.name || 'Unknown'} - {template?.alignment || 'unknown'}
                    </div>
                  </div>
                  <div className={`text-xs uppercase ${
                    player.status === 'alive' ? 'text-success' : 'text-accent-primary'
                  }`}>
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
