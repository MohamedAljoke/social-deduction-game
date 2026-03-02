import { useState } from 'react';
import { Card, Button, Input } from '../../shared/components';
import { ScreenContainer } from '../../shared/ui/ScreenContainer';
import { Logo } from '../../shared/ui/Logo';
import { useCreateMatch, useJoinMatch } from './hooks';

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
              <div className="text-lg font-semibold mb-6 flex items-center gap-2.5">
                <span className="w-1 h-5 bg-accent-primary rounded-sm"></span>
                Create New Game
              </div>
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
              <div className="text-lg font-semibold mb-6 flex items-center gap-2.5">
                <span className="w-1 h-5 bg-accent-primary rounded-sm"></span>
                Enter Game Details
              </div>
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

          {error && (
            <div className="bg-accent-primary/10 border border-accent-primary/30 text-accent-primary px-3 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center my-6 text-text-muted text-xs">
            <div className="flex-1 h-px bg-border"></div>
            <span className="px-4">or</span>
            <div className="flex-1 h-px bg-border"></div>
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
