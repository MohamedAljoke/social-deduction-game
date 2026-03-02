import { useNavigate } from 'react-router-dom';
import { Card, Button, Avatar, Badge } from '../../shared/components';
import { ScreenContainer } from '../../shared/ui/ScreenContainer';
import { Logo } from '../../shared/ui/Logo';
import { useGame } from '../session/context/GameContext';
import { useLobby, useLobbySocket } from './hooks';

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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/30 rounded-full text-success text-[13px] font-medium mb-5">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
            {isHost ? 'Ready to start' : 'Waiting for host to start'}
          </div>

          <div className="bg-bg-secondary border-2 border-dashed border-border rounded-2xl p-6 text-center mb-6">
            <div className="text-xs text-text-muted uppercase tracking-widest mb-2">Game Code</div>
            <div className="text-[36px] font-bold text-accent-primary tracking-widest font-mono">{match.id.toUpperCase()}</div>
          </div>

          <div className="mb-6">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-3">
              Players (<span>{match.players.length}</span>)
            </div>
            {match.players.map((player, index) => (
              <div key={player.id} className="flex items-center gap-3 p-3 bg-bg-secondary rounded-xl mb-2">
                <Avatar name={player.name} index={index} />
                <span className="font-medium">{player.name}</span>
                {index === 0 && <Badge variant="host">Host</Badge>}
              </div>
            ))}
          </div>

          {isHost && (
            <>
              <Button onClick={() => navigate('/templates')} variant="secondary">
                Configure Templates
              </Button>
              <Button onClick={handleStartGame} loading={loading} className="mt-3">
                Start Game
              </Button>
            </>
          )}
        </Card>
      </div>
    </ScreenContainer>
  );
}
