import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../../../shared/components";
import { ScreenContainer } from "../../../shared/ui/ScreenContainer";
import { Logo } from "../../../shared/ui/Logo";
import { useGame } from "../../../context/GameContext";
import { GAME_ACTIONS } from "../../../types/gameActions";
import { t } from "@/infrastructure/i18n/translations";
import type {
  Alignment,
  Template,
  WinCondition,
  WinConditionConfig,
} from "@/types/match";

interface BuilderTemplate {
  name: string;
  alignment: Alignment;
  abilities: string[];
  winCondition: WinCondition;
  winConditionConfig?: WinConditionConfig;
}

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

// Shared classes for native inputs/selects in the builder
const NATIVE_INPUT_CLASSES =
  "flex-1 py-3 px-4 rounded-lg text-sm font-inherit focus:outline-none bg-surface-raised border-2 border-rim text-ink focus:border-brand";

export function TemplateBuilderScreen() {
  const navigate = useNavigate();
  const { state, dispatch, service } = useGame();
  const [loading, setLoading] = useState(false);

  const DEFAULT_TEMPLATES: BuilderTemplate[] = [
    { name: "Killer",    alignment: "villain", abilities: ["kill"],        winCondition: "team_parity" },
    { name: "Detective", alignment: "hero",    abilities: ["investigate"], winCondition: "team_parity" },
  ];

  const playerCount = state.match?.players.length ?? 2;
  const maxTemplates = Math.max(2, playerCount);

  const templates: BuilderTemplate[] =
    state.configuredTemplates.length > 0
      ? state.configuredTemplates
      : state.match && state.match.templates.length > 0
        ? state.match.templates.map(mapMatchTemplateToBuilderTemplate)
        : DEFAULT_TEMPLATES;

  const updateTemplate = (
    index: number,
    field: string,
    value: string | string[] | { targetAlignment?: string },
  ) => {
    const updated = templates.map((tmpl, i) =>
      i === index ? { ...tmpl, [field]: value } : tmpl,
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
      const apiTemplates = templates.map((tmpl) => ({
        name: tmpl.name.trim() || undefined,
        alignment: tmpl.alignment,
        abilities: tmpl.abilities.map((id) => ({ id })),
        winCondition: tmpl.winCondition,
        winConditionConfig: tmpl.winConditionConfig,
      }));
      await service.startMatch(state.matchId, apiTemplates);
      navigate("/game");
    } catch {
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
      <div className="fade-in w-full">
        <Logo title={t('templateBuilder.title')} subtitle={t('templateBuilder.subtitle')} />

        <Card>
          <div className="text-lg font-semibold mb-6 flex items-center gap-2.5 text-ink">
            <span className="w-1 h-5 rounded-sm bg-brand" />
            {t('templateBuilder.playerTemplates')}
          </div>

          <div className="mb-5">
            {templates.map((template, index) => (
              <div
                key={index}
                data-testid="template-card"
                className="rounded-2xl p-5 mb-4 bg-surface-raised border-2 border-rim"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-ink-secondary">
                    {t('templateBuilder.templateLabel')} {index + 1}
                  </span>
                  {templates.length > 2 && (
                    <button
                      className="text-xs font-semibold uppercase tracking-wider cursor-pointer bg-transparent border-none text-danger"
                      onClick={() => handleRemoveTemplate(index)}
                    >
                      {t('templateBuilder.remove')}
                    </button>
                  )}
                </div>

                {/* Template name */}
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    className={NATIVE_INPUT_CLASSES}
                    placeholder={t('templateBuilder.templateNamePlaceholder')}
                    value={template.name}
                    onChange={(e) => updateTemplate(index, "name", e.target.value)}
                    maxLength={20}
                  />
                </div>

                {/* Alignment select */}
                <div className="flex gap-3 mb-3">
                  <select
                    data-testid="template-alignment-select"
                    className={`${NATIVE_INPUT_CLASSES} cursor-pointer`}
                    value={template.alignment}
                    onChange={(e) => updateTemplate(index, "alignment", e.target.value)}
                  >
                    <option value="hero">{getRoleName('hero')}</option>
                    <option value="villain">{getRoleName('villain')}</option>
                    <option value="neutral">{getRoleName('neutral')}</option>
                  </select>
                </div>

                {/* Win condition select */}
                <div className="flex gap-3 mb-3">
                  <select
                    data-testid="template-win-condition-select"
                    className={`${NATIVE_INPUT_CLASSES} cursor-pointer`}
                    value={template.winCondition}
                    onChange={(e) => {
                      const nextWinCondition = e.target.value as BuilderTemplate["winCondition"];
                      const updated = templates.map((currentTemplate, i) =>
                        i === index
                          ? {
                              ...currentTemplate,
                              winCondition: nextWinCondition,
                              winConditionConfig:
                                nextWinCondition === "eliminate_alignment"
                                  ? currentTemplate.winConditionConfig ?? { targetAlignment: "villain" }
                                  : undefined,
                            }
                          : currentTemplate,
                      );
                      dispatch({ type: GAME_ACTIONS.SET_TEMPLATES, payload: updated });
                    }}
                  >
                    {WIN_CONDITION_IDS.map((condition) => (
                      <option key={condition.id} value={condition.id}>
                        {getWinConditionName(condition.id)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target alignment select (conditional) */}
                {template.winCondition === "eliminate_alignment" && (
                  <div className="flex gap-3 mb-3">
                    <select
                      data-testid="template-target-alignment-select"
                      className={`${NATIVE_INPUT_CLASSES} cursor-pointer`}
                      value={template.winConditionConfig?.targetAlignment ?? "villain"}
                      onChange={(e) =>
                        updateTemplate(index, "winConditionConfig", {
                          targetAlignment: e.target.value as Alignment,
                        })
                      }
                    >
                      <option value="hero">{getTargetAlignmentName('hero')}</option>
                      <option value="villain">{getTargetAlignmentName('villain')}</option>
                      <option value="neutral">{getTargetAlignmentName('neutral')}</option>
                    </select>
                  </div>
                )}

                {/* Ability chips */}
                <div className="flex flex-wrap gap-2">
                  {ABILITY_IDS.map((ability) => {
                    const isActive = template.abilities.includes(ability.id);
                    return (
                      <div
                        key={ability.id}
                        data-testid="ability-chip"
                        aria-pressed={isActive}
                        className={`inline-flex items-center gap-1.5 py-2 px-3.5 rounded-full text-[13px] cursor-pointer transition-all duration-200 border-2 text-ink
                          ${isActive
                            ? "bg-brand border-brand"
                            : "bg-surface-card border-rim hover:border-brand"
                          }`}
                        onClick={() => toggleAbility(index, ability.id)}
                      >
                        <span className="text-sm">{ability.icon}</span>
                        {getAbilityName(ability.id)}
                      </div>
                    );
                  })}
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
            <div className="text-xs mt-2 text-ink-muted">
              {t('templateBuilder.templatesCount')}: {templates.length}/{maxTemplates}
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <Button variant="secondary" onClick={() => navigate("/lobby")} className="flex-1">
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

function mapMatchTemplateToBuilderTemplate(template: Template): BuilderTemplate {
  return {
    name: template.name,
    alignment: template.alignment,
    abilities: template.abilities.map((ability) => ability.id),
    winCondition: template.winCondition ?? "team_parity",
    winConditionConfig: template.winConditionConfig ?? undefined,
  };
}
