import { z } from "zod";

// Define Schema for Questionnaire Data
export const questionnaireSchema = z.object({
  makeupUsage: z.enum(["yes", "no", "prefer_not_to_say"], {
    required_error: "Please select if you use makeup",
  }),
  ageGroup: z.enum(
    ["under_18", "18_24", "25_34", "35_44", "45_54", "55_plus"],
    { required_error: "Please select your age group" }
  ),
  naturalHairColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, {
      message: "Please enter a valid hex color code (e.g., #RRGGBB)",
    })
    .min(7) // Ensure it includes '#' and 6 hex digits
    .max(7),
  skinReactionToSun: z.enum(
    ["burns_easily", "burns_then_tans", "tans_easily", "tans_deeply"],
    { required_error: "Please select how your skin reacts to the sun" }
  ),
  veinColor: z.enum(["blue_or_purple", "green", "blue_and_green"], {
    required_error: "Please select your vein color",
  }),
  jewelryPreference: z.enum(
    ["silver_platinum", "gold", "rose_gold_or_both", "unknown"],
    { required_error: "Please select your jewelry preference" }
  ),
  flatteringColors: z.string().optional(),
  unflatteringColors: z.string().optional(),
});

export type QuestionnaireFormData = z.infer<typeof questionnaireSchema>;
