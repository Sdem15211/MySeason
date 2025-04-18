import { z } from "zod";
import { questionnaireSchema } from "./questionnaire"; // Assuming this exists

const ColorLABSchema = z.object({
  L: z.number(),
  A: z.number(),
  B: z.number(),
});

const ContrastSchema = z.object({
  skinEyeRatio: z.number().optional(),
  skinHairRatio: z.number().optional(), // Based on questionnaire naturalHairColor
  eyeHairRatio: z.number().optional(), // Based on questionnaire naturalHairColor
  overall: z.enum(["High", "Medium", "Low"]).optional(), // Calculated contrast category
});

const ExtractedColorsSchema = z.object({
  skinColorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .nullable(),
  skinColorLAB: ColorLABSchema.nullable(),
  averageEyeColorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .nullable(),
  averageEyebrowColorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .nullable(),
  averageLipColorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .nullable(),
  contrast: ContrastSchema.optional(),
  calculatedUndertone: z.string().nullable().optional(), // Optional pre-calculated undertone
});

export const LLMInputSchema = z.object({
  extractedColors: ExtractedColorsSchema,
  // We reuse the questionnaire schema, assuming it's defined elsewhere
  // If not, define it here based on the prompt.md structure
  questionnaireAnswers: questionnaireSchema, // Or define the structure explicitly here if needed
});

export type LLMInput = z.infer<typeof LLMInputSchema>;
