import { Template } from "../../domain/models/template";
import { TemplateRepository } from "../../domain/repositories/TemplateRepository";

export class InMemoryTemplateRepository implements TemplateRepository {
  private templates = new Map<string, Template>();

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
