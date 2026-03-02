import { useState } from 'react';
import { Card, Button, Input } from '../../shared/components';
import { ScreenContainer } from '../../shared/ui/ScreenContainer';
import { Logo } from '../../shared/ui/Logo';
import { useCreateMatch, useJoinMatch } from './hooks';
import './HomeScreen.css';

export function HomeScreen() {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('');
  const [matchCode, setMatchCode] = useState('');

  const { create, loading: createLoading, error: createError } = useCreateMatch();
  const { join, loading: joinLoading, error: joinError } = useJoinMatch();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    create(playerName.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !matchCode.trim()) return;
    join(matchCode.trim(), playerName.trim());
  };

  const loading = createLoading || joinLoading;
  const error = mode === 'create' ? createError : joinError;

  return (
    <ScreenContainer>
      <div className="fade-in">
        <Logo title="Social Deduction" subtitle="Create or join a game with friends" />
        
        <Card>
          {mode === 'create' ? (
            <form onSubmit={handleCreate}>
              <div className="card-title">Create New Game</div>
              <Input
                id="playerName"
                label="Your Name"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                required
              />
              <Button type="submit" loading={loading}>
                Create Game
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin}>
              <div className="card-title">Enter Game Details</div>
              <Input
                id="joinName"
                label="Your Name"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                required
              />
              <Input
                id="gameCode"
                label="Match ID"
                placeholder="Enter match ID"
                value={matchCode}
                onChange={(e) => setMatchCode(e.target.value)}
                maxLength={10}
                required
              />
              <Button type="submit" loading={loading}>
                Join Game
              </Button>
            </form>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="divider">
            <span>or</span>
          </div>

          <Button
            variant="secondary"
            onClick={() => setMode(mode === 'create' ? 'join' : 'create')}
          >
            {mode === 'create' ? 'Join Existing Game' : 'Back to Create'}
          </Button>
        </Card>
      </div>
    </ScreenContainer>
  );
}
