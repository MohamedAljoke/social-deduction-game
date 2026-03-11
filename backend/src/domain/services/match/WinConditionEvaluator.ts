import { Player } from "../../entity/player";
import {
  Alignment,
  Template,
  WinCondition,
} from "../../entity/template";
import type { MatchWinner, TemplateWinnerSummary } from "../../entity/match";

export class WinConditionEvaluator {
  public evaluate(players: Player[], templates: Template[]): MatchWinner | null {
    const templatesById = new Map(
      templates.map((template) => [template.id, template]),
    );
    const aliveEntries = players
      .filter((player) => player.isAlive())
      .map((player) => {
        const templateId = player.getTemplateId();
        if (!templateId) return null;
        const template = templatesById.get(templateId);
        if (!template) return null;
        return { player, template };
      })
      .filter((entry): entry is { player: Player; template: Template } => entry !== null);

    const templateWinners = this.getTemplateWinners(aliveEntries, templates);
    if (templateWinners.length > 0) {
      return {
        kind: "templates",
        templates: templateWinners,
      };
    }

    const counts = this.getAliveAlignmentCounts(aliveEntries);
    const aliveHeroes = counts[Alignment.Hero];
    const aliveVillains = counts[Alignment.Villain];

    if (aliveHeroes > 0 && aliveVillains === 0) {
      return {
        kind: "alignment",
        alignment: Alignment.Hero,
      };
    }

    if (aliveVillains > 0 && aliveVillains >= aliveHeroes) {
      return {
        kind: "alignment",
        alignment: Alignment.Villain,
      };
    }

    return null;
  }

  private getTemplateWinners(
    aliveEntries: Array<{ player: Player; template: Template }>,
    templates: Template[],
  ): TemplateWinnerSummary[] {
    const totalAlignmentCounts = this.getTotalAlignmentCounts(templates);
    const aliveAlignmentCounts = this.getAliveAlignmentCounts(aliveEntries);

    return aliveEntries.flatMap(({ template }) => {
      switch (template.winCondition) {
        case WinCondition.EliminateAlignment: {
          const targetAlignment = template.winConditionConfig?.targetAlignment;
          if (!targetAlignment) {
            return [];
          }

          if (totalAlignmentCounts[targetAlignment] === 0) {
            return [];
          }

          if (aliveAlignmentCounts[targetAlignment] > 0) {
            return [];
          }

          return [
            {
              templateId: template.id,
              templateName: template.name,
              alignment: template.alignment,
            },
          ];
        }
        case WinCondition.TeamParity:
        default:
          return [];
      }
    });
  }

  private getAliveAlignmentCounts(
    aliveEntries: Array<{ player: Player; template: Template }>,
  ): Record<Alignment, number> {
    const counts: Record<Alignment, number> = {
      [Alignment.Hero]: 0,
      [Alignment.Villain]: 0,
      [Alignment.Neutral]: 0,
    };

    for (const { template } of aliveEntries) {
      counts[template.alignment] += 1;
    }

    return counts;
  }

  private getTotalAlignmentCounts(
    templates: Template[],
  ): Record<Alignment, number> {
    const counts: Record<Alignment, number> = {
      [Alignment.Hero]: 0,
      [Alignment.Villain]: 0,
      [Alignment.Neutral]: 0,
    };

    for (const template of templates) {
      counts[template.alignment] += 1;
    }

    return counts;
  }
}
