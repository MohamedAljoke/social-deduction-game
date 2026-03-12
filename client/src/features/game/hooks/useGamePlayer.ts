import { useMemo } from "react";
import { t } from "@/infrastructure/i18n/translations";
import { useGame } from "../../../context/GameContext";
import type { GameLogEntry } from "../components/gameScreenShared";
import { ABILITY_DEFINITIONS, type EffectTypeId } from "@shared/ability-definitions";

export const PHASE_CONFIG: Record<
  string,
  { title: string; description: string }
> = {
  discussion: {
    title: t('game.phases.discussion.name'),
    description: t('game.phases.discussion.desc'),
  },
  action: { title: t('game.phases.action.name'), description: t('game.phases.action.desc') },
  voting: { title: t('game.phases.voting.name'), description: t('game.phases.voting.desc') },
  resolution: { title: t('game.phases.resolution.name'), description: t('game.phases.resolution.desc') },
};

export const ABILITY_LABELS: Record<string, string> = {
  kill: `🗡️ ${ABILITY_DEFINITIONS.kill.label}`,
  protect: `🛡️ ${ABILITY_DEFINITIONS.protect.label}`,
  vote_shield: `🛡️ ${ABILITY_DEFINITIONS.vote_shield.label}`,
  roleblock: `🚫 ${ABILITY_DEFINITIONS.roleblock.label}`,
  investigate: `🔍 ${ABILITY_DEFINITIONS.investigate.label}`,
};

export const PLAYER_COLORS = [
  "#667eea",
  "#f093fb",
  "#4facfe",
  "#43e97b",
  "#fa709a",
];

export function useGamePlayer() {
  const { state } = useGame();
  const { match, playerId } = state;

  const currentPlayer = useMemo(() => {
    if (!match) return null;
    return match.players.find((p) => p.id === playerId) || null;
  }, [match, playerId]);

  const currentTemplate = useMemo(() => {
    if (!match || !currentPlayer) return null;
    return (
      match.templates.find((t) => t.id === currentPlayer.templateId) || null
    );
  }, [match, currentPlayer]);

  const phaseConfig = useMemo(() => {
    if (!match) return { title: "", description: "" };
    return PHASE_CONFIG[match.phase] || { title: match.phase, description: "" };
  }, [match]);

  const isHost = state.isHost;

  return {
    match,
    playerId,
    currentPlayer,
    currentTemplate,
    phaseConfig,
    isHost,
  };
}

export function useGameLog() {
  const { state } = useGame();
  const { match } = state;

  const formatAction = (action: {
    effectType?: string;
    EffectType?: string;
    actorId: string;
    targetIds: string[];
  }): GameLogEntry | null => {
    if (!match) return null;

    const actor = match.players.find((p) => p.id === action.actorId);
    const targets = action.targetIds
      .map((id) => match.players.find((p) => p.id === id))
      .filter(Boolean);
    const effectType = action.effectType ?? action.EffectType;

    const verbStr = effectType
      ? (ABILITY_DEFINITIONS[effectType as EffectTypeId]?.verb ?? effectType)
      : "acted on";

    return {
      actorName: actor?.name || "Unknown",
      targetNames: targets.map((t) => t?.name).join(", "),
      verb: verbStr,
    };
  };

  const isGameLogEntry = (entry: GameLogEntry | null): entry is GameLogEntry =>
    entry !== null;

  const actions = useMemo(() => {
    if (!match) return [];
    return match.actions.slice().reverse().map(formatAction).filter(isGameLogEntry);
  }, [match]);

  return { actions };
}
