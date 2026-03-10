import { useMemo } from "react";
import { useGame } from "../../../context/GameContext";
import type { GameLogEntry } from "../components/gameScreenShared";

export const PHASE_CONFIG: Record<
  string,
  { title: string; description: string }
> = {
  discussion: {
    title: "Discussion",
    description: "Discuss with other players",
  },
  action: { title: "Action", description: "Use your abilities" },
  voting: { title: "Voting", description: "Vote to eliminate a player" },
  resolution: { title: "Resolution", description: "Processing results..." },
};

export const ABILITY_LABELS: Record<string, string> = {
  kill: "🗡️ Kill",
  protect: "🛡️ Protect",
  roleblock: "🚫 Roleblock",
  investigate: "🔍 Investigate",
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

    const verb: Record<string, string> = {
      kill: "killed",
      protect: "protected",
      roleblock: "roleblocked",
      investigate: "investigated",
    };

    return {
      actorName: actor?.name || "Unknown",
      targetNames: targets.map((t) => t?.name).join(", "),
      verb: (effectType && verb[effectType]) || effectType || "acted on",
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
