import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../../../shared/components";
import { ScreenContainer } from "../../../shared/ui/ScreenContainer";
import { Logo } from "../../../shared/ui/Logo";
import { useGame } from "../../../context/GameContext";
import { GAME_ACTIONS } from "../../../types/gameActions";
import { t } from "@/infrastructure/i18n/translations";
import type { Template } from "@/types/match";

const ABILITY_IDS = [
  { id: "kill", icon: "🗡️" },
  { id: "protect", icon: "🛡️" },
  { id: "vote_shield", icon: "🛡️" },
  { id: "roleblock", icon: "🚫" },
  { id: "investigate", icon: "🔍" },
];

const WIN_CONDITION_IDS = [
  { id: "team_parity" },
  { id: "eliminate_alignment" },
] as const;

const getAbilityName = (id: string): string => {
  const mapping: Record<string, string> = {
    kill: t('templateBuilder.abilities.kill'),
    protect: t('templateBuilder.abilities.protect'),
    vote_shield: t('templateBuilder.abilities.voteShield'),
    roleblock: t('templateBuilder.abilities.roleblock'),
    investigate: t('templateBuilder.abilities.investigate'),
  };
  return mapping[id] || id;
};

const getWinConditionName = (id: string): string => {
  const mapping: Record<string, string> = {
    team_parity: t('templateBuilder.victoryConditions.teamVictory'),
    eliminate_alignment: t('templateBuilder.victoryConditions.eliminateAlignment'),
  };
  return mapping[id] || id;
};

const getTargetAlignmentName = (alignment: string): string => {
  const mapping: Record<string, string> = {
    hero: t('templateBuilder.victoryConditions.eliminateHeroes'),
    villain: t('templateBuilder.victoryConditions.eliminateVillains'),
    neutral: t('templateBuilder.victoryConditions.eliminateNeutrals'),
  };
  return mapping[alignment] || alignment;
};

const getRoleName = (alignment: string): string => {
  const mapping: Record<string, string> = {
    hero: t('templateBuilder.roles.hero'),
    villain: t('templateBuilder.roles.villain'),
    neutral: t('templateBuilder.roles.neutral'),
  };
  return mapping[alignment] || alignment;
};

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
      : state.match && state.match.templates.length > 0
        ? state.match.templates.map(mapMatchTemplateToBuilderTemplate)
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
      alert(t('templateBuilder.errorStarting'));
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
          title={t('templateBuilder.title')}
          subtitle={t('templateBuilder.subtitle')}
        />

        <Card>
          <div className="text-lg font-semibold mb-6 flex items-center gap-2.5">
            <span
              className="w-1 h-5 rounded-sm"
              style={{ backgroundColor: "#e94560" }}
            ></span>
            {t('templateBuilder.playerTemplates')}
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
                    {t('templateBuilder.templateLabel')} {index + 1}
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
                      {t('templateBuilder.remove')}
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
                    placeholder={t('templateBuilder.templateNamePlaceholder')}
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
                    <option value="hero">{getRoleName('hero')}</option>
                    <option value="villain">{getRoleName('villain')}</option>
                    <option value="neutral">{getRoleName('neutral')}</option>
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
                    {WIN_CONDITION_IDS.map((condition) => (
                      <option key={condition.id} value={condition.id}>
                        {getWinConditionName(condition.id)}
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
                      <option value="hero">{getTargetAlignmentName('hero')}</option>
                      <option value="villain">{getTargetAlignmentName('villain')}</option>
                      <option value="neutral">{getTargetAlignmentName('neutral')}</option>
                    </select>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {ABILITY_IDS.map((ability) => (
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
                      {getAbilityName(ability.id)}
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
                ? `${t('templateBuilder.maxTemplatesReached')} (${maxTemplates})`
                : t('templateBuilder.addTemplate')}
            </Button>
            <div className="text-xs mt-2" style={{ color: "#6b6b80" }}>
              {t('templateBuilder.templatesCount')}: {templates.length}/{maxTemplates}
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <Button
              variant="secondary"
              onClick={() => navigate("/lobby")}
              className="flex-1"
            >
              {t('templateBuilder.backBtn')}
            </Button>
            <Button onClick={handleSave} loading={loading} className="flex-1">
              {t('templateBuilder.saveAndStart')}
            </Button>
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
}

function mapMatchTemplateToBuilderTemplate(template: Template) {
  return {
    name: template.name,
    alignment: template.alignment,
    abilities: template.abilities.map((ability) => ability.id),
    winCondition: template.winCondition ?? "team_parity",
    winConditionConfig: template.winConditionConfig ?? undefined,
  };
}
