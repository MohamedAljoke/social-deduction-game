import { TemplateRepository } from "../domain/repositories/TemplateRepository";

export class ListTemplatesUseCase {
  constructor(private readonly repository: TemplateRepository) {}

  async execute() {
    const templates = await this.repository.findAll();

    return {
      templates: templates.map(t => ({
        id: t.id,
        alignment: t.alignment,
        abilities: t.abilities.map(a => ({
          id: a.id,
          canUseWhenDead: a.canUseWhenDead,
        })),
      })),
    };
  }
}
