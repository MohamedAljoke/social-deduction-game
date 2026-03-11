import { Action } from "../../entity/action";
import { PhaseType } from "../../entity/phase";
import { Player, PlayerResponse } from "../../entity/player";
import { Alignment, Template } from "../../entity/template";
import type { MatchConfig, MatchStatus, MatchWinner } from "../../entity/match";

export interface MatchSnapshotSource {
  id: string;
  name: string;
  createdAt: Date;
  status: MatchStatus;
  players: Player[];
  phase: PhaseType;
  actions: Action[];
  templates: Template[];
  votes: Array<{ voterId: string; targetId: string | null }>;
  config: MatchConfig;
  winner: MatchWinner | null;
  winnerAlignment: Alignment | null;
  endedAt: Date | null;
}

export class MatchSnapshotMapper {
  public map(source: MatchSnapshotSource) {
    return {
      id: source.id,
      name: source.name,
      createdAt: source.createdAt,
      status: source.status,
      players: source.players.map(
        (player: Player): PlayerResponse => player.toJSON(),
      ),
      phase: source.phase,
      actions: source.actions.map((action) => ({
        actorId: action.actorId,
        EffectType: action.effectType,
        targetIds: action.targetIds,
        cancelled: action.cancelled,
      })),
      templates: source.templates.map((template) => ({
        id: template.id,
        name: template.name,
        alignment: template.alignment,
        abilities: template.abilities.map((ability) => ({
          id: ability.id,
        })),
        winCondition: template.winCondition,
        winConditionConfig: template.winConditionConfig ?? null,
      })),
      votes: source.votes,
      config: source.config,
      winner: source.winner,
      winnerAlignment: source.winnerAlignment,
      endedAt: source.endedAt,
    };
  }
}
