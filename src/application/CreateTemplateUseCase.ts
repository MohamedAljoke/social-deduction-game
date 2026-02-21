import crypto from "node:crypto";
import { Template, Alignment } from "../domain/template";
import { Ability, AbilityId } from "../domain/ability";
import { TemplateRepository } from "../infrastructure/persistence/TemplateRepository";

export interface CreateTemplateInput {
  alignment: Alignment;
  abilities: { id: AbilityId; canUseWhenDead: boolean }[];
}

export interface CreateTemplateOutput {
  id: string;
}

export class CreateTemplateUseCase {
  constructor(private readonly templateRepository: TemplateRepository) {}

  async execute(input: CreateTemplateInput): Promise<CreateTemplateOutput> {
    const template = new Template(
      crypto.randomUUID(),
      input.alignment,
      input.abilities.map(
        (a) => new Ability(a.id, a.canUseWhenDead)
      )
    );

    await this.templateRepository.save(template);

    return {
      id: template.id,
    };
  }
}
