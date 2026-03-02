import { useNavigate } from 'react-router-dom';
import { useGame } from '../session/context/GameContext';
import { useGameSocket, useGameActions, useGamePlayer, useGameLog, ABILITY_LABELS, PLAYER_COLORS } from './hooks';

export function GameScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const { match, playerId, currentPlayer, currentTemplate, phaseConfig } = useGamePlayer();
  const { 
    selectedAbility, 
    selectedTarget, 
    selectedVote,
    handleAbilityClick, 
    handleTargetClick, 
    handleConfirm, 
    handleCancelAbility 
  } = useGameActions();
  const { actions } = useGameLog();

  useGameSocket();

  const handleLeave = () => {
    if (confirm('Leave the game?')) {
      navigate('/');
    }
  };

  if (!match) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-[480px] mx-auto px-5">
      <div className="flex justify-between items-center mb-5">
        <button className="bg-transparent border-none text-text-secondary cursor-pointer text-sm flex items-center gap-1.5 hover:text-text-primary" onClick={handleLeave}>
          ← Leave Game
        </button>
      </div>

      {currentTemplate && match.phase === 'action' && (
        <div className="bg-bg-card border-2 border-accent-primary rounded-2xl p-4 mb-5 text-center">
          <div className="text-xs text-text-muted uppercase tracking-widest">Your Role</div>
          <div className="text-xl font-bold text-accent-primary my-1">{currentTemplate.name}</div>
          <div className={`text-xs uppercase ${
            currentTemplate.alignment === 'hero' ? 'text-success' : 
            currentTemplate.alignment === 'villain' ? 'text-accent-primary' : 'text-warning'
          }`}>
            {currentTemplate.alignment}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl p-5 text-center mb-5">
        <div className="text-2xl font-bold uppercase tracking-wider">{phaseConfig.title}</div>
        <div className="text-sm opacity-90 mt-1">{phaseConfig.description}</div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 mb-5">
        {match.players.map((player, index) => {
          const isDead = player.status !== 'alive';
          const isSelf = player.id === playerId;
          const isSelected = selectedTarget === player.id || selectedVote === player.id;
          
          return (
            <div
              key={player.id}
              className={`bg-bg-card border-2 border-border rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${
                isDead ? 'opacity-50 border-text-muted' : 
                isSelected ? 'border-accent-primary shadow-[0_0_20px_rgba(233,69,96,0.4)]' : 
                'hover:border-accent-primary hover:-translate-y-0.5'
              }`}
              onClick={() => !isDead && handleTargetClick(player.id)}
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg mx-auto mb-2.5"
                style={{ 
                  background: `linear-gradient(135deg, ${PLAYER_COLORS[index % PLAYER_COLORS.length]}, #764ba2)`
                }}
              >
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="font-semibold text-sm mb-1">
                {player.name}{isSelf ? ' (You)' : ''}
              </div>
              <div className={`text-[11px] uppercase ${
                player.status === 'alive' ? 'text-success' : 'text-accent-primary'
              }`}>
                {player.status}
              </div>
            </div>
          );
        })}
      </div>

      {match.phase === 'action' && currentTemplate && (
        <div className="bg-bg-card border-2 border-border rounded-2xl p-5 mb-5">
          <div className="text-sm font-semibold mb-3 text-text-secondary">Your Abilities</div>
          <div className="flex flex-wrap gap-2">
            {currentTemplate.abilities.map(ability => (
              <button
                key={ability.id}
                className={`flex items-center gap-2 py-3 px-4 bg-bg-secondary border-2 border-border rounded-lg text-text-primary text-sm cursor-pointer transition-all duration-200 ${
                  selectedAbility === ability.id ? 'bg-accent-primary border-accent-primary' : 'hover:border-accent-primary'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={() => handleAbilityClick(ability.id)}
              >
                {ABILITY_LABELS[ability.id] || ability.id}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedAbility && selectedTarget && (
        <div className="bg-bg-card border-2 border-border rounded-2xl p-5 mb-5 text-center">
          <div className="text-base mb-4">Confirm your action</div>
          <button className="py-3 px-8 bg-success border-none rounded-lg text-white text-sm font-semibold cursor-pointer hover:opacity-90" onClick={handleConfirm}>
            Confirm
          </button>
          <button className="py-3 px-8 bg-transparent border-2 border-border rounded-lg text-text-muted text-sm cursor-pointer ml-3" onClick={handleCancelAbility}>
            Cancel
          </button>
        </div>
      )}

      {match.phase === 'voting' && (
        <div className="bg-bg-card border-2 border-border rounded-2xl p-5 mb-5 text-center">
          <div className="text-base mb-4">Vote to eliminate a player</div>
          <button 
            className="py-3 px-8 bg-success border-none rounded-lg text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={!selectedVote}
            onClick={handleConfirm}
          >
            Cast Vote
          </button>
        </div>
      )}

      <div className="bg-bg-card border-2 border-border rounded-2xl p-4 max-h-[200px] overflow-y-auto">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Game Log</div>
        {actions.length === 0 ? (
          <div className="text-sm text-text-secondary py-1.5 border-b border-border">Game started. Waiting for actions...</div>
        ) : (
          actions.map((action, i) => (
            <div key={i} className="text-sm text-text-secondary py-1.5 border-b border-border last:border-b-0">
              <span className="text-accent-primary font-semibold">{action?.actorName}</span> {action?.verb}{' '}
              <span className="text-success font-semibold">{action?.targetNames}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
