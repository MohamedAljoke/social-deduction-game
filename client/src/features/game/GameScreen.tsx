import { useNavigate } from 'react-router-dom';
import { useGame } from '../session/context/GameContext';
import { useGameSocket, useGameActions, useGamePlayer, useGameLog, ABILITY_LABELS, PLAYER_COLORS } from './hooks';
import './GameScreen.css';

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
    <div className="game-screen">
      <div className="game-header">
        <button className="game-back-btn" onClick={handleLeave}>
          ← Leave Game
        </button>
      </div>

      {currentTemplate && match.phase === 'action' && (
        <div className="my-role-card">
          <div className="my-role-title">Your Role</div>
          <div className="my-role-name">{currentTemplate.name}</div>
          <div className={`my-role-alignment ${currentTemplate.alignment}`}>
            {currentTemplate.alignment}
          </div>
        </div>
      )}

      <div className="phase-banner">
        <div className="phase-title">{phaseConfig.title}</div>
        <div className="phase-description">{phaseConfig.description}</div>
      </div>

      <div className="player-grid">
        {match.players.map((player, index) => {
          const isDead = player.status !== 'alive';
          const isSelf = player.id === playerId;
          const isSelected = selectedTarget === player.id || selectedVote === player.id;
          
          return (
            <div
              key={player.id}
              className={`game-player-card ${isDead ? 'dead' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => !isDead && handleTargetClick(player.id)}
            >
              <div className="game-player-avatar" style={{ 
                background: `linear-gradient(135deg, ${PLAYER_COLORS[index % PLAYER_COLORS.length]}, #764ba2)`
              }}>
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="game-player-name">
                {player.name}{isSelf ? ' (You)' : ''}
              </div>
              <div className={`game-player-status ${player.status}`}>
                {player.status}
              </div>
            </div>
          );
        })}
      </div>

      {match.phase === 'action' && currentTemplate && (
        <div className="abilities-panel">
          <div className="abilities-title">Your Abilities</div>
          <div className="abilities-list">
            {currentTemplate.abilities.map(ability => (
              <button
                key={ability.id}
                className={`ability-btn ${selectedAbility === ability.id ? 'active' : ''}`}
                onClick={() => handleAbilityClick(ability.id)}
              >
                {ABILITY_LABELS[ability.id] || ability.id}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedAbility && selectedTarget && (
        <div className="action-panel">
          <div className="action-instruction">Confirm your action</div>
          <button className="action-confirm-btn" onClick={handleConfirm}>
            Confirm
          </button>
          <button className="action-cancel-btn" onClick={handleCancelAbility}>
            Cancel
          </button>
        </div>
      )}

      {match.phase === 'voting' && (
        <div className="vote-panel">
          <div className="vote-instruction">Vote to eliminate a player</div>
          <button 
            className="vote-confirm-btn" 
            disabled={!selectedVote}
            onClick={handleConfirm}
          >
            Cast Vote
          </button>
        </div>
      )}

      <div className="log-panel">
        <div className="log-title">Game Log</div>
        {actions.length === 0 ? (
          <div className="log-entry">Game started. Waiting for actions...</div>
        ) : (
          actions.map((action, i) => (
            <div key={i} className="log-entry">
              <span className="actor">{action?.actorName}</span> {action?.verb}{' '}
              <span className="target">{action?.targetNames}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
