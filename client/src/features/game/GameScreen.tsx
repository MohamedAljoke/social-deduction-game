import { useNavigate } from 'react-router-dom';
import { useGame } from '../session/context/GameContext';
import { useSocket } from '../session/hooks/useSocket';
import type { ServerEvent } from '../../types/events';
import type { Match } from '../../types/game';
import './GameScreen.css';

const PHASE_CONFIG: Record<string, { title: string; description: string }> = {
  discussion: { title: 'Discussion', description: 'Discuss with other players' },
  action: { title: 'Action', description: 'Use your abilities' },
  voting: { title: 'Voting', description: 'Vote to eliminate a player' },
  resolution: { title: 'Resolution', description: 'Processing results...' },
};

export function GameScreen() {
  const navigate = useNavigate();
  const { state, dispatch, fetchMatch, useAbility, castVote } = useGame();
  const { match, playerId, selectedAbility, selectedTarget, selectedVote } = state;

  const handleSocketEvent = async (event: ServerEvent) => {
    switch (event.type) {
      case 'match_updated':
        dispatch({ type: 'UPDATE_MATCH', payload: event.state as Match });
        break;
      case 'phase_changed':
        dispatch({ type: 'SET_PHASE', payload: event.phase });
        break;
      case 'match_ended':
        navigate('/end');
        break;
    }
  };

  useSocket({
    matchId: state.matchId,
    playerId: state.playerId,
    onEvent: handleSocketEvent,
  });

  if (!match) {
    return <div>Loading...</div>;
  }

  const currentPlayer = match.players.find(p => p.id === playerId);
  const currentTemplate = match.templates.find(t => t.id === currentPlayer?.templateId);
  const phaseConfig = PHASE_CONFIG[match.phase] || { title: match.phase, description: '' };

  const handleAbilityClick = (abilityId: string) => {
    dispatch({ type: 'SELECT_ABILITY', payload: selectedAbility === abilityId ? null : abilityId });
  };

  const handleTargetClick = (targetId: string) => {
    if (match.phase === 'action' && selectedAbility) {
      dispatch({ type: 'SELECT_TARGET', payload: targetId });
    } else if (match.phase === 'voting') {
      dispatch({ type: 'SELECT_VOTE', payload: targetId });
    }
  };

  const handleConfirm = async () => {
    if (selectedAbility && selectedTarget) {
      await useAbility(selectedAbility, selectedTarget);
    } else if (selectedVote) {
      await castVote(selectedVote);
    }
  };

  const handleLeave = () => {
    if (confirm('Leave the game?')) {
      navigate('/');
    }
  };

  const abilityLabels: Record<string, string> = {
    kill: '🗡️ Kill',
    protect: '🛡️ Protect',
    roleblock: '🚫 Roleblock',
    investigate: '🔍 Investigate',
  };

  const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

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
                background: `linear-gradient(135deg, ${colors[index % colors.length]}, #764ba2)`
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
                {abilityLabels[ability.id] || ability.id}
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
          <button className="action-cancel-btn" onClick={() => dispatch({ type: 'SELECT_ABILITY', payload: null })}>
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
        {match.actions.length === 0 ? (
          <div className="log-entry">Game started. Waiting for actions...</div>
        ) : (
          match.actions.slice().reverse().map((action, i) => {
            const actor = match.players.find(p => p.id === action.actorId);
            const targets = action.targetIds.map(id => match.players.find(p => p.id === id)).filter(Boolean);
            const verb: Record<string, string> = {
              kill: 'killed', protect: 'protected', 
              roleblock: 'roleblocked', investigate: 'investigated'
            };
            return (
              <div key={i} className="log-entry">
                <span className="actor">{actor?.name}</span> {verb[action.abilityId] || action.abilityId}{' '}
                <span className="target">{targets.map(t => t?.name).join(', ')}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
