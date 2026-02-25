import { TemplateRepository } from "../../domain/ports/persistance/TemplateRepository";
import { Alignment, Template } from "../../domain/entity/template";

export class InMemoryTemplateRepository implements TemplateRepository {
  private templates = new Map<string, Template>();

  constructor() {
    const hero = new Template("hero", Alignment.Hero, []);
    const villain = new Template("villain", Alignment.Villain, []);

    this.templates.set(hero.id, hero);
    this.templates.set(villain.id, villain);
  }

  async save(template: Template): Promise<void> {
    this.templates.set(template.id, template);
  }

  async findById(id: string): Promise<Template | null> {
    return this.templates.get(id) ?? null;
  }

  async findByIds(ids: string[]): Promise<Template[]> {
    return ids
      .map((id) => this.templates.get(id))
      .filter((t): t is Template => t !== undefined);
  }

  async findAll(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }
}

