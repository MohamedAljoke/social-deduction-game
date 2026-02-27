import { z } from "zod";
import { Alignment } from "../../../domain/entity/template";
import { AbilityId } from "../../../domain/entity/ability";

export const CreateMatchSchema = z
  .object({
    name: z.string().optional(),
  })
  .optional();

export type CreateMatchBody = z.infer<typeof CreateMatchSchema>;

export const JoinMatchSchema = z.object({
  name: z.string().min(1, "Player name is required"),
});

export type JoinMatchBody = z.infer<typeof JoinMatchSchema>;

export const TemplateAbilitySchema = z.object({
  id: z.enum(AbilityId),
});

export const TemplateSchema = z.object({
  alignment: z.enum(Alignment),
  abilities: z.array(TemplateAbilitySchema).min(1),
});

export const StartMatchSchema = z.object({
  templates: z.array(TemplateSchema).min(1),
});

export type StartMatchBody = z.infer<typeof StartMatchSchema>;
