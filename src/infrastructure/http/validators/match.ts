import { z } from "zod";
import { Alignment } from "../../../domain/entity/template";
import { EffectType } from "../../../domain/entity/ability";

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
  id: z.enum(EffectType),
  priority: z.number().optional(),
  canUseWhenDead: z.boolean().optional(),
  targetCount: z.number().optional(),
  canTargetSelf: z.boolean().optional(),
  requiresAliveTarget: z.boolean().optional(),
});

export const TemplateSchema = z.object({
  name: z.string().optional(),
  alignment: z.enum(Alignment),
  abilities: z.array(TemplateAbilitySchema).min(1),
});

export const StartMatchSchema = z.object({
  templates: z.array(TemplateSchema).min(1),
});

export type StartMatchBody = z.infer<typeof StartMatchSchema>;

export const UseAbilitySchema = z.object({
  actorId: z.string().min(1, "Actor ID is required"),
  effectType: z.enum(EffectType),
  targetIds: z.array(z.string().min(1, "Target ID is required")),
});

export type UseAbilityBody = z.infer<typeof UseAbilitySchema>;

export const CastVoteSchema = z.object({
  voterId: z.string().min(1, "Voter ID is required"),
  targetId: z.string().min(1, "Target ID is required"),
});

export type CastVoteBody = z.infer<typeof CastVoteSchema>;
