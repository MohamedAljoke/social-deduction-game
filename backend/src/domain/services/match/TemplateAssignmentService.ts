import {
  InsufficientPlayers,
  MatchAlreadyStarted,
  TemplatePlayerCountMismatch,
} from "../../errors";
import { Player } from "../../entity/player";
import { Template } from "../../entity/template";

export class TemplateAssignmentService {
  public assign(
    status: string,
    players: Player[],
    templates: Template[],
  ): Template[] {
    if (status !== "lobby") {
      throw new MatchAlreadyStarted();
    }

    if (players.length < 2) {
      throw new InsufficientPlayers();
    }

    if (templates.length > players.length) {
      throw new TemplatePlayerCountMismatch(templates.length, players.length);
    }

    const missing = players.length - templates.length;
    const paddedTemplates = [
      ...templates,
      ...Array.from({ length: Math.max(0, missing) }, (_, index) =>
        Template.default(`default_template_${templates.length + index}`),
      ),
    ];

    const assignedTemplates = this.shuffle(paddedTemplates);
    for (let index = 0; index < players.length; index++) {
      players[index].assignTemplate(assignedTemplates[index].id);
    }

    return assignedTemplates;
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }
}
