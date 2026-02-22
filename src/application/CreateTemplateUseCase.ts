import crypto from "node:crypto";
import { Template, Alignment, WinCondition } from "../domain/template";
import { Ability, AbilityId } from "../domain/ability";
import { TemplateRepository } from "../domain/repositories/TemplateRepository";

export interface CreateTemplateInput {
  alignment: Alignment;
  abilities: { id: AbilityId; canUseWhenDead: boolean; targetCount?: number; canTargetSelf?: boolean; requiresAliveTarget?: boolean }[];
  winCondition?: WinCondition;
  endsGameOnWin?: boolean;
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
        (a) => new Ability(
          a.id, 
          a.canUseWhenDead, 
          a.targetCount ?? 1, 
          a.canTargetSelf ?? false, 
          a.requiresAliveTarget ?? true
        )
      ),
      input.winCondition,
      input.endsGameOnWin,
    );

    await this.templateRepository.save(template);

    return {
      id: template.id,
    };
  }
}
