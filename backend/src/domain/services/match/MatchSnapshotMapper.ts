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
  // A viewer sees their own role and actions; everyone's roles become public when the match ends.
  public map(source: MatchSnapshotSource, viewerId: string | null = null) {
    const rolesArePublic = source.status === "finished";
    const canSee = (playerId: string) => rolesArePublic || playerId === viewerId;

    return {
      id: source.id,
      name: source.name,
      createdAt: source.createdAt,
      status: source.status,
      players: source.players.map(
        (player: Player): PlayerResponse & { templateId?: string } => ({
          ...player.toJSON(),
          templateId: canSee(player.id) ? player.getTemplateId() : undefined,
        }),
      ),
      phase: source.phase,
      actions: source.actions.filter((action) => canSee(action.actorId)).map((action) => ({
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
