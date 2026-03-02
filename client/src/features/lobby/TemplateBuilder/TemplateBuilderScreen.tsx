import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../../../shared/components';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { Logo } from '../../../shared/ui/Logo';
import { useGame } from '../../session/context/GameContext';
import './TemplateBuilderScreen.css';

const ABILITIES = [
  { id: 'kill', name: 'Kill', icon: '🗡️' },
  { id: 'protect', name: 'Protect', icon: '🛡️' },
  { id: 'roleblock', name: 'Roleblock', icon: '🚫' },
  { id: 'investigate', name: 'Investigate', icon: '🔍' },
];

export function TemplateBuilderScreen() {
  const navigate = useNavigate();
  const { state, dispatch, startMatch } = useGame();
  const [loading, setLoading] = useState(false);

  const playerCount = state.match?.players.length || 0;
  const templates = state.configuredTemplates.length > 0 
    ? state.configuredTemplates 
    : Array(playerCount).fill(null).map((_, i) => ({
        name: i === 0 ? 'Infiltrator' : 'Citizen',
        alignment: i === 0 ? 'villain' as const : 'hero' as const,
        abilities: i === 0 ? ['kill'] : ['investigate'],
      }));

  const updateTemplate = (index: number, field: string, value: string | string[]) => {
    dispatch({ 
      type: 'UPDATE_TEMPLATE', 
      payload: { index, template: { ...templates[index], [field]: value } } 
    });
  };

  const toggleAbility = (index: number, abilityId: string) => {
    const current = templates[index].abilities;
    const updated = current.includes(abilityId)
      ? current.filter(a => a !== abilityId)
      : [...current, abilityId];
    updateTemplate(index, 'abilities', updated);
  };

  const handleSave = async () => {
    dispatch({ type: 'SET_TEMPLATES', payload: templates });
    setLoading(true);
    try {
      await startMatch();
      navigate('/game');
    } catch (err) {
      alert('Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <div className="fade-in">
        <Logo title="Template Builder" subtitle="Configure roles for each player" />
        
        <Card>
          <div className="card-title">Player Templates</div>
          
          <div className="templates-container">
            {templates.map((template, index) => (
              <div key={index} className="template-card">
                <div className="template-card-header">
                  <span className="template-number">Template {index + 1}</span>
                </div>
                <div className="template-row">
                  <input
                    type="text"
                    className="template-name-input"
                    placeholder="Template name"
                    value={template.name}
                    onChange={(e) => updateTemplate(index, 'name', e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div className="template-row">
                  <select
                    className="alignment-select"
                    value={template.alignment}
                    onChange={(e) => updateTemplate(index, 'alignment', e.target.value)}
                  >
                    <option value="hero">Hero</option>
                    <option value="villain">Villain</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div className="ability-chips">
                  {ABILITIES.map(ability => (
                    <div
                      key={ability.id}
                      className={`ability-chip ${template.abilities.includes(ability.id) ? 'selected' : ''}`}
                      onClick={() => toggleAbility(index, ability.id)}
                    >
                      <span className="icon">{ability.icon}</span>
                      {ability.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="template-builder-actions">
            <Button variant="secondary" onClick={() => navigate('/lobby')}>
              Back to Lobby
            </Button>
            <Button onClick={handleSave} loading={loading}>
              Save & Start
            </Button>
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
}
