import { useNavigate } from 'react-router-dom';
import { Card, Button, Avatar } from '../../shared/components';
import { ScreenContainer } from '../../shared/ui/ScreenContainer';
import { Logo } from '../../shared/ui/Logo';
import { useGame } from '../session/context/GameContext';
import './EndScreen.css';

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
          <div className="winner-banner">
            <div className="winner-label">Winner</div>
            <div className="winner-value">Game Ended!</div>
          </div>

          <div className="role-reveal-title">Role Reveal</div>
          <div className="role-list">
            {match.players.map((player, index) => {
              const template = match.templates.find(t => t.id === player.templateId);
              return (
                <div key={player.id} className="role-item">
                  <Avatar name={player.name} index={index} />
                  <div className="role-info">
                    <div className="role-name">{player.name}</div>
                    <div className={`role-template ${template?.alignment || 'unknown'}`}>
                      {template?.name || 'Unknown'} - {template?.alignment || 'unknown'}
                    </div>
                  </div>
                  <div className={`role-status ${player.status}`}>
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
