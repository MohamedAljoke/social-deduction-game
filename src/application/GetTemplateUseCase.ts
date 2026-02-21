import { TemplateRepository } from "../infrastructure/persistence/TemplateRepository";
import { TemplateNotFound } from "../domain/errors";

export class GetTemplateUseCase {
  constructor(private readonly repository: TemplateRepository) {}

  async execute(templateId: string) {
    const template = await this.repository.findById(templateId);

    if (!template) {
      throw new TemplateNotFound();
    }

    return {
      id: template.id,
      alignment: template.alignment,
      abilities: template.abilities.map(a => ({
        id: a.id,
        canUseWhenDead: a.canUseWhenDead,
      })),
    };
  }
}
