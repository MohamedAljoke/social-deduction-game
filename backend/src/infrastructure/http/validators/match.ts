import { z } from "zod";
import {
  Alignment,
  WinCondition,
} from "../../../domain/entity/template";
import { EffectType } from "../../../domain/entity/ability";

export const CreateMatchSchema = z
  .object({
    name: z.string().optional(),
    config: z
      .object({
        showVotingTransparency: z.boolean().optional(),
        aiGameMasterEnabled: z.boolean().optional(),
      })
      .optional(),
  })
  .optional();

export type CreateMatchBody = z.infer<typeof CreateMatchSchema>;

export const JoinMatchSchema = z.object({
  name: z.string().min(1, "Player name is required"),
});

export type JoinMatchBody = z.infer<typeof JoinMatchSchema>;

export const TemplateAbilitySchema = z.object({
  id: z.enum(EffectType),
});

export const TemplateSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  alignment: z.enum(Alignment),
  abilities: z.array(TemplateAbilitySchema),
  winCondition: z.enum(WinCondition).optional().default(WinCondition.TeamParity),
  winConditionConfig: z
    .object({
      targetAlignment: z.enum(Alignment),
    })
    .optional(),
}).superRefine((value, ctx) => {
  if (
    value.winCondition === WinCondition.EliminateAlignment &&
    !value.winConditionConfig?.targetAlignment
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["winConditionConfig", "targetAlignment"],
      message: "Target alignment is required for eliminate_alignment",
    });
  }

  if (
    value.winCondition !== WinCondition.EliminateAlignment &&
    value.winConditionConfig
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["winConditionConfig"],
      message: "winConditionConfig is only allowed for eliminate_alignment",
    });
  }
});

export const StartMatchSchema = z.object({
  templates: z.array(TemplateSchema).optional().default([]),
});

export type StartMatchBody = z.infer<typeof StartMatchSchema>;

export const UseAbilitySchema = z.object({
  actorId: z.string().min(1, "Actor ID is required"),
  EffectType: z.enum(EffectType),
  targetIds: z.array(z.string().min(1, "Target ID is required")),
});

export type UseAbilityBody = z.infer<typeof UseAbilitySchema>;

export const SubmitVoteSchema = z.object({
  voterId: z.string().min(1, "Voter ID is required"),
  targetId: z.string().min(1, "Target ID is required").nullable(),
});

export type SubmitVoteBody = z.infer<typeof SubmitVoteSchema>;

export const LeaveMatchSchema = z.object({
  playerId: z.string().min(1, "Player ID is required"),
});

export type LeaveMatchBody = z.infer<typeof LeaveMatchSchema>;
