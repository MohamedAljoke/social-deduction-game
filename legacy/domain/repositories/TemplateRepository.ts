import { Template } from "../models/template";

export interface TemplateRepository {
  save(template: Template): Promise<void>;
  findById(id: string): Promise<Template | null>;
  findByIds(ids: string[]): Promise<Template[]>;
  findAll(): Promise<Template[]>;
}
