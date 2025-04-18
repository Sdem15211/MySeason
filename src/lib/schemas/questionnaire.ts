import { z } from "zod";

// Define Schema for Questionnaire Data
export const questionnaireSchema = z.object({
  naturalHairColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, {
      message: "Please select your natural hair color",
    })
    .min(7) // Ensure it includes '#' and 6 hex digits
    .max(7),
  skinReactionToSun: z.enum(
    [
      "always_burn_rarely_tan",
      "burn_then_tan",
      "tan_easily_occasionally_burn",
      "always_tan_never_burn",
    ],
    {
      required_error: "Please select how your skin reacts to sun exposure",
    }
  ),
  blushColor: z.enum(["rosy_pink_red", "peachy_golden", "unsure"], {
    required_error: "Please select your blush color",
  }),
  whiteOrCreamPreference: z.enum(
    ["pure_white", "off_white_cream", "both_equal"],
    {
      required_error: "Please select whether pure white or cream looks better",
    }
  ),
  veinColor: z.enum(["blue_purple", "green_olive", "mix_both", "unsure"], {
    required_error: "Please select the predominant color of your veins",
  }),
  jewelryPreference: z.enum(
    ["silver_white", "gold_yellow", "rose_gold_copper", "unsure"],
    { required_error: "Please select which metal tones complement your skin" }
  ),
  flatteringColors: z.string().optional(),
  unflatteringColors: z.string().optional(),
  makeupAdvicePreference: z.enum(["yes", "no"], {
    required_error: "Please indicate if you'd like makeup advice",
  }),
});

export type QuestionnaireFormData = z.infer<typeof questionnaireSchema>;
