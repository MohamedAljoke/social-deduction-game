import { ABILITY_LABELS } from "../hooks";
import { t } from "@/infrastructure/i18n/translations";
import type { AvailableAbility } from "../hooks/useAvailableAbilities";

interface AbilitySelectorProps {
  availableAbilities: AvailableAbility[];
  selectedAbility: string | null;
  onAbilityClick: (abilityId: string) => void;
}

export function AbilitySelector({
  availableAbilities,
  selectedAbility,
  onAbilityClick,
}: AbilitySelectorProps) {
  if (availableAbilities.length === 0) return null;

  const canUseAny = availableAbilities.some((a) => a.isAvailable);

  return (
    <div
      className="rounded-2xl p-5 mb-5"
      style={{ backgroundColor: "#16213e", border: "2px solid #2a2a4a" }}
    >
      <div className="text-sm font-semibold mb-3" style={{ color: "#a0a0b8" }}>
        {t('game.yourAbilities')} {!canUseAny && t('game.noAbilities')}
      </div>
      <div className="flex flex-wrap gap-2">
        {availableAbilities.map((ability) => (
          <button
            key={ability.id}
            className="flex items-center gap-2 py-3 px-4 rounded-lg text-sm cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor:
                selectedAbility === ability.id ? "#e94560" : "#1a1a2e",
              border: "2px solid",
              borderColor:
                selectedAbility === ability.id ? "#e94560" : "#2a2a4a",
              color: ability.isAvailable ? "#ffffff" : "#6b6b80",
            }}
            onClick={() => ability.isAvailable && onAbilityClick(ability.id)}
            disabled={!ability.isAvailable}
            title={ability.reason}
          >
            {ABILITY_LABELS[ability.id] || ability.id}
            {!ability.isAvailable && ability.reason && (
              <span className="text-xs ml-1 opacity-70">
                ({ability.reason})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
