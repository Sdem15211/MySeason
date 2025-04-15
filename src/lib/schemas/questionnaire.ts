import { z } from "zod";

// Define Schema for Questionnaire Data
export const questionnaireSchema = z.object({
  // Keep optional fields for now, might remove if not needed by LLM later
  naturalHairColor: z.string().optional(),
  eyeColor: z.string().optional(),
  skinReactionToSun: z
    .enum(["burns_easily", "tans_easily", "burns_then_tans"])
    .optional(),

  // New fields
  gender: z.enum(["man", "woman", "other"], {
    required_error: "Please select your gender",
  }),
  ageGroup: z.enum(
    ["under_18", "18_24", "25_34", "35_44", "45_54", "55_plus"],
    {
      required_error: "Please select your age group",
    }
  ),
  personality: z.enum(["introvert", "extravert", "ambivert"], {
    required_error: "Please select your personality type",
  }),
  placeholderInfo1: z.string().optional(),
  placeholderInfo2: z.string().optional(),
  placeholderInfo3: z.boolean().optional(),
});

export type QuestionnaireFormData = z.infer<typeof questionnaireSchema>;
