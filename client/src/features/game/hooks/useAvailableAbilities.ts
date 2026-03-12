import { useMemo } from "react";
import { useGame } from "../../../context/GameContext";
import type { Ability } from "../../../types/match";
import { ABILITY_DEFINITIONS, type EffectTypeId } from "@shared/ability-definitions";

export interface AvailableAbility extends Ability {
  isAvailable: boolean;
  reason?: string;
}

export function useAvailableAbilities() {
  const { state } = useGame();
  const { match, playerId } = state;

  const availableAbilities = useMemo(() => {
    if (!match || !playerId) return [];

    const currentPlayer = match.players.find((p) => p.id === playerId);
    if (!currentPlayer) return [];

    const currentTemplate = match.templates.find(
      (t) => t.id === currentPlayer.templateId
    );
    if (!currentTemplate) return [];

    const playerActionsThisPhase = match.actions.filter(
      (action) => action.actorId === playerId
    );
    const usedAbilityIds = new Set(playerActionsThisPhase.map((a) => a.effectType));

    const isAlive = currentPlayer.status === "alive";

    return currentTemplate.abilities.map((ability) => {
      const metadata = ABILITY_DEFINITIONS[ability.id as EffectTypeId];
      
      if (!metadata) {
        return {
          ...ability,
          isAvailable: false,
          reason: "Unknown ability",
        } as AvailableAbility;
      }

      if (!isAlive && !metadata.canUseWhenDead) {
        return {
          ...ability,
          isAvailable: false,
          reason: "Cannot use while dead",
        } as AvailableAbility;
      }

      if (usedAbilityIds.has(ability.id)) {
        return {
          ...ability,
          isAvailable: false,
          reason: "Already used this phase",
        } as AvailableAbility;
      }

      const validTargets = match.players.filter((target) => {
        if (target.id === playerId && !metadata.canTargetSelf) {
          return false;
        }
        if (metadata.requiresAliveTarget && target.status !== "alive") {
          return false;
        }
        return true;
      });

      if (validTargets.length < metadata.targetCount) {
        return {
          ...ability,
          isAvailable: false,
          reason: "No valid targets available",
        } as AvailableAbility;
      }

      return {
        ...ability,
        isAvailable: true,
      } as AvailableAbility;
    });
  }, [match, playerId]);

  const canUseAnyAbility = useMemo(() => {
    return availableAbilities.some((a) => a.isAvailable);
  }, [availableAbilities]);

  return {
    availableAbilities,
    canUseAnyAbility,
  };
}
