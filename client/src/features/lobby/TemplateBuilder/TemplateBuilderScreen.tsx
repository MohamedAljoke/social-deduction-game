import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../../../shared/components";
import { ScreenContainer } from "../../../shared/ui/ScreenContainer";
import { Logo } from "../../../shared/ui/Logo";
import { useGame } from "../../../context/GameContext";
import { GAME_ACTIONS } from "../../../types/gameActions";

const ABILITIES = [
  { id: "kill", name: "Kill", icon: "🗡️" },
  { id: "protect", name: "Protect", icon: "🛡️" },
  { id: "roleblock", name: "Roleblock", icon: "🚫" },
  { id: "investigate", name: "Investigate", icon: "🔍" },
];

export function TemplateBuilderScreen() {
  const navigate = useNavigate();
  const { state, dispatch, service } = useGame();
  const [loading, setLoading] = useState(false);

  const playerCount = state.match?.players.length || 0;
  const templates =
    state.configuredTemplates.length > 0
      ? state.configuredTemplates
      : Array(playerCount)
          .fill(null)
          .map((_, i) => ({
            name: i === 0 ? "Infiltrator" : "Citizen",
            alignment: i === 0 ? ("villain" as const) : ("hero" as const),
            abilities: i === 0 ? ["kill"] : ["investigate"],
          }));

  const updateTemplate = (
    index: number,
    field: string,
    value: string | string[],
  ) => {
    dispatch({
      type: GAME_ACTIONS.UPDATE_TEMPLATE,
      payload: { index, template: { ...templates[index], [field]: value } },
    });
  };

  const toggleAbility = (index: number, abilityId: string) => {
    const current = templates[index].abilities;
    const updated = current.includes(abilityId)
      ? current.filter((a) => a !== abilityId)
      : [...current, abilityId];
    updateTemplate(index, "abilities", updated);
  };

  const handleSave = async () => {
    if (!state.matchId) return;
    dispatch({ type: GAME_ACTIONS.SET_TEMPLATES, payload: templates });
    setLoading(true);
    try {
      const apiTemplates = templates.map((t) => ({
        name: t.name,
        alignment: t.alignment,
        abilities: t.abilities.map((id) => ({ id })),
      }));
      await service.startMatch(state.matchId, apiTemplates);
      navigate("/game");
    } catch (err) {
      alert("Failed to start game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <div className="fade-in">
        <Logo
          title="Template Builder"
          subtitle="Configure roles for each player"
        />

        <Card>
          <div className="text-lg font-semibold mb-6 flex items-center gap-2.5">
            <span
              className="w-1 h-5 rounded-sm"
              style={{ backgroundColor: "#e94560" }}
            ></span>
            Player Templates
          </div>

          <div className="mb-5">
            {templates.map((template, index) => (
              <div
                key={index}
                className="rounded-2xl p-5 mb-4"
                style={{
                  backgroundColor: "#1a1a2e",
                  border: "2px solid #2a2a4a",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "#a0a0b8" }}
                  >
                    Template {index + 1}
                  </span>
                </div>
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    className="flex-1 py-3 px-4 rounded-lg text-sm font-inherit focus:outline-none"
                    style={{
                      backgroundColor: "#1a1a2e",
                      border: "2px solid #2a2a4a",
                      color: "#ffffff",
                    }}
                    placeholder="Template name"
                    value={template.name}
                    onChange={(e) =>
                      updateTemplate(index, "name", e.target.value)
                    }
                    maxLength={20}
                  />
                </div>
                <div className="flex gap-3 mb-3">
                  <select
                    className="flex-1 py-3 px-4 rounded-lg text-sm font-inherit cursor-pointer focus:outline-none"
                    style={{
                      backgroundColor: "#1a1a2e",
                      border: "2px solid #2a2a4a",
                      color: "#ffffff",
                    }}
                    value={template.alignment}
                    onChange={(e) =>
                      updateTemplate(index, "alignment", e.target.value)
                    }
                  >
                    <option value="hero">Hero</option>
                    <option value="villain">Villain</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ABILITIES.map((ability) => (
                    <div
                      key={ability.id}
                      className={`inline-flex items-center gap-1.5 py-2 px-3.5 rounded-full text-[13px] cursor-pointer transition-all duration-200 ${
                        template.abilities.includes(ability.id)
                          ? ""
                          : "hover:border-[#e94560]"
                      }`}
                      style={{
                        backgroundColor: template.abilities.includes(ability.id)
                          ? "#e94560"
                          : "#16213e",
                        border: "2px solid",
                        borderColor: template.abilities.includes(ability.id)
                          ? "#e94560"
                          : "#2a2a4a",
                        color: "#ffffff",
                      }}
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
            <Button
              variant="secondary"
              onClick={() => navigate("/lobby")}
              className="flex-1"
            >
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
