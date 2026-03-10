import { Player } from "../entity/player";
import { Alignment, Template } from "../entity/template";

export class WinConditionEvaluator {
  public evaluate(players: Player[], templates: Template[]): Alignment | null {
    const counts = this.getAliveAlignmentCounts(players, templates);
    const aliveHeroes = counts[Alignment.Hero];
    const aliveVillains = counts[Alignment.Villain];

    if (aliveHeroes > 0 && aliveVillains === 0) {
      return Alignment.Hero;
    }

    if (aliveVillains > 0 && aliveVillains >= aliveHeroes) {
      return Alignment.Villain;
    }

    return null;
  }

  private getAliveAlignmentCounts(
    players: Player[],
    templates: Template[],
  ): Record<Alignment, number> {
    const counts: Record<Alignment, number> = {
      [Alignment.Hero]: 0,
      [Alignment.Villain]: 0,
      [Alignment.Neutral]: 0,
    };

    const templatesById = new Map(
      templates.map((template) => [template.id, template]),
    );

    for (const player of players) {
      if (!player.isAlive()) {
        continue;
      }

      const templateId = player.getTemplateId();
      if (!templateId) {
        continue;
      }

      const template = templatesById.get(templateId);
      if (!template) {
        continue;
      }

      counts[template.alignment] += 1;
    }

    return counts;
  }
}
