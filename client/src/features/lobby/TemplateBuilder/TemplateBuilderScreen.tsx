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

const WIN_CONDITIONS = [
  { id: "team_parity", name: "Team Victory" },
  { id: "eliminate_alignment", name: "Eliminate Alignment" },
] as const;

export function TemplateBuilderScreen() {
  const navigate = useNavigate();
  const { state, dispatch, service } = useGame();
  const [loading, setLoading] = useState(false);

  const DEFAULT_TEMPLATES = [
    {
      name: "Killer",
      alignment: "villain" as const,
      abilities: ["kill"],
      winCondition: "team_parity" as const,
    },
    {
      name: "Detective",
      alignment: "hero" as const,
      abilities: ["investigate"],
      winCondition: "team_parity" as const,
    },
  ];

  const playerCount = state.match?.players.length ?? 2;
  const maxTemplates = Math.max(2, playerCount);

  const templates =
    state.configuredTemplates.length > 0
      ? state.configuredTemplates
      : DEFAULT_TEMPLATES;

  const updateTemplate = (
    index: number,
    field: string,
    value:
      | string
      | string[]
      | {
          targetAlignment?: string;
        },
  ) => {
    const updated = templates.map((t, i) =>
      i === index ? { ...t, [field]: value } : t,
    );
    dispatch({ type: GAME_ACTIONS.SET_TEMPLATES, payload: updated });
  };

  const toggleAbility = (index: number, EffectType: string) => {
    const current = templates[index].abilities;
    const updated = current.includes(EffectType)
      ? current.filter((a) => a !== EffectType)
      : [...current, EffectType];
    updateTemplate(index, "abilities", updated);
  };

  const handleSave = async () => {
    if (!state.matchId) return;
    dispatch({ type: GAME_ACTIONS.SET_TEMPLATES, payload: templates });
    setLoading(true);
    try {
      const apiTemplates = templates.map((t) => ({
        name: t.name.trim() || undefined,
        alignment: t.alignment,
        abilities: t.abilities.map((id) => ({ id })),
        winCondition: t.winCondition,
        winConditionConfig: t.winConditionConfig,
      }));
      await service.startMatch(state.matchId, apiTemplates);
      navigate("/game");
    } catch (err) {
      alert("Failed to start game");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = () => {
    if (templates.length >= maxTemplates) return;
    const next = [
      ...templates,
      {
        name: `Template ${templates.length + 1}`,
        alignment: "hero" as const,
        abilities: [],
        winCondition: "team_parity" as const,
      },
    ];
    dispatch({ type: GAME_ACTIONS.SET_TEMPLATES, payload: next });
  };

  const handleRemoveTemplate = (index: number) => {
    if (templates.length <= 2) return;
    const next = templates.filter((_, i) => i !== index);
    dispatch({ type: GAME_ACTIONS.SET_TEMPLATES, payload: next });
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
                data-testid="template-card"
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
                  {templates.length > 2 && (
                    <button
                      className="text-xs font-semibold uppercase tracking-wider cursor-pointer"
                      style={{
                        color: "#e94560",
                        background: "transparent",
                        border: "none",
                      }}
                      onClick={() => handleRemoveTemplate(index)}
                    >
                      Remove
                    </button>
                  )}
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
                    data-testid="template-alignment-select"
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
                <div className="flex gap-3 mb-3">
                  <select
                    data-testid="template-win-condition-select"
                    className="flex-1 py-3 px-4 rounded-lg text-sm font-inherit cursor-pointer focus:outline-none"
                    style={{
                      backgroundColor: "#1a1a2e",
                      border: "2px solid #2a2a4a",
                      color: "#ffffff",
                    }}
                    value={template.winCondition}
                    onChange={(e) => {
                      const nextWinCondition = e.target.value;
                      const updated = templates.map((currentTemplate, i) =>
                        i === index
                          ? {
                              ...currentTemplate,
                              winCondition: nextWinCondition,
                              winConditionConfig:
                                nextWinCondition === "eliminate_alignment"
                                  ? currentTemplate.winConditionConfig ?? {
                                      targetAlignment: "villain",
                                    }
                                  : undefined,
                            }
                          : currentTemplate,
                      );
                      dispatch({
                        type: GAME_ACTIONS.SET_TEMPLATES,
                        payload: updated,
                      });
                    }}
                  >
                    {WIN_CONDITIONS.map((condition) => (
                      <option key={condition.id} value={condition.id}>
                        {condition.name}
                      </option>
                    ))}
                  </select>
                </div>
                {template.winCondition === "eliminate_alignment" && (
                  <div className="flex gap-3 mb-3">
                    <select
                      data-testid="template-target-alignment-select"
                      className="flex-1 py-3 px-4 rounded-lg text-sm font-inherit cursor-pointer focus:outline-none"
                      style={{
                        backgroundColor: "#1a1a2e",
                        border: "2px solid #2a2a4a",
                        color: "#ffffff",
                      }}
                      value={template.winConditionConfig?.targetAlignment ?? "villain"}
                      onChange={(e) =>
                        updateTemplate(index, "winConditionConfig", {
                          targetAlignment: e.target.value,
                        })
                      }
                    >
                      <option value="hero">Eliminate Heroes</option>
                      <option value="villain">Eliminate Villains</option>
                      <option value="neutral">Eliminate Neutrals</option>
                    </select>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {ABILITIES.map((ability) => (
                    <div
                      key={ability.id}
                      data-testid="ability-chip"
                      aria-pressed={template.abilities.includes(ability.id)}
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
            <Button
              variant="secondary"
              onClick={handleAddTemplate}
              disabled={templates.length >= maxTemplates}
            >
              {templates.length >= maxTemplates
                ? `Max templates reached (${maxTemplates})`
                : "Add Template"}
            </Button>
            <div className="text-xs mt-2" style={{ color: "#6b6b80" }}>
              Templates: {templates.length}/{maxTemplates}
            </div>
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
