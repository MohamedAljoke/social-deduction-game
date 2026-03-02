import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../../../shared/components';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { Logo } from '../../../shared/ui/Logo';
import { useGame } from '../../session/context/GameContext';

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
          <div className="text-lg font-semibold mb-6 flex items-center gap-2.5">
            <span className="w-1 h-5 bg-accent-primary rounded-sm"></span>
            Player Templates
          </div>
          
          <div className="mb-5">
            {templates.map((template, index) => (
              <div key={index} className="bg-bg-secondary border-2 border-border rounded-2xl p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-text-secondary">Template {index + 1}</span>
                </div>
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    className="flex-1 py-3 px-4 bg-bg-secondary border-2 border-border rounded-lg text-text-primary text-sm font-inherit focus:outline-none focus:border-accent-primary placeholder:text-text-muted"
                    placeholder="Template name"
                    value={template.name}
                    onChange={(e) => updateTemplate(index, 'name', e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div className="flex gap-3 mb-3">
                  <select
                    className="flex-1 py-3 px-4 bg-bg-secondary border-2 border-border rounded-lg text-text-primary text-sm font-inherit cursor-pointer focus:outline-none focus:border-accent-primary"
                    value={template.alignment}
                    onChange={(e) => updateTemplate(index, 'alignment', e.target.value)}
                  >
                    <option value="hero">Hero</option>
                    <option value="villain">Villain</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ABILITIES.map(ability => (
                    <div
                      key={ability.id}
                      className={`inline-flex items-center gap-1.5 py-2 px-3.5 bg-bg-card border-2 border-border rounded-full text-[13px] cursor-pointer transition-all duration-200 ${
                        template.abilities.includes(ability.id) ? 'bg-accent-primary border-accent-primary' : 'hover:border-accent-primary'
                      }`}
                      onClick={() => toggleAbility(index, ability.id)}
                    >
                      <span className="text-sm">{ability.icon}</span>
                      {ability.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-5">
            <Button variant="secondary" onClick={() => navigate('/lobby')} className="flex-1">
              Back to Lobby
            </Button>
            <Button onClick={handleSave} loading={loading} className="flex-1">
              Save & Start
            </Button>
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
}
