import { useNavigate } from 'react-router-dom';
import { Card, Button, Avatar, Badge } from '../../shared/components';
import { ScreenContainer } from '../../shared/ui/ScreenContainer';
import { Logo } from '../../shared/ui/Logo';
import { useGame } from '../session/context/GameContext';
import { useLobby, useLobbySocket } from './hooks';
import './LobbyScreen.css';

export function LobbyScreen() {
  const navigate = useNavigate();
  const { state } = useGame();
  const { match, isHost, loading, handleStartGame } = useLobby();
  useLobbySocket();

  if (!match) {
    return <div>Loading...</div>;
  }

  return (
    <ScreenContainer>
      <div className="fade-in">
        <Logo title="Game Lobby" subtitle="Waiting for players to join" />
        
        <Card>
          <div className="status-badge">
            {isHost ? 'Ready to start' : 'Waiting for host to start'}
          </div>

          <div className="match-code">
            <div className="match-code-label">Game Code</div>
            <div className="match-code-value">{match.id.toUpperCase()}</div>
          </div>

          <div className="player-list">
            <div className="player-list-title">
              Players (<span>{match.players.length}</span>)
            </div>
            {match.players.map((player, index) => (
              <div key={player.id} className="player-item">
                <Avatar name={player.name} index={index} />
                <span className="player-name">{player.name}</span>
                {index === 0 && <Badge variant="host">Host</Badge>}
              </div>
            ))}
          </div>

          {isHost && (
            <>
              <Button onClick={() => navigate('/templates')} variant="secondary">
                Configure Templates
              </Button>
              <Button onClick={handleStartGame} loading={loading} style={{ marginTop: 12 }}>
                Start Game
              </Button>
            </>
          )}
        </Card>
      </div>
    </ScreenContainer>
  );
}
