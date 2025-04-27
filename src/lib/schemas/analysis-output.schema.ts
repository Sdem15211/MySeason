import { z } from "zod";

const ColorInfoSchema = z.object({
  name: z.string(),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format"),
});

const PersonalPaletteSchema = z.object({
  powerColors: z.array(ColorInfoSchema).length(5),
  additionalCompatibleColors: z.array(ColorInfoSchema).length(3),
});

const ColorToAvoidSchema = z.object({
  color: ColorInfoSchema,
  explanation: z.string().max(150),
});

const MakeupRecommendationsSchema = z.object({
  foundationUndertoneGuidance: z.string(),
  blushRecommendation: z.string(),
  complementaryLipColors: z.array(z.string()).min(2).max(3),
  complementaryEyeColors: z.array(z.string()).min(2).max(3),
  makeupExplanation: z.string(),
});

const StyleScenarioSchema = z.object({
  colorCombinationAdvice: z.string(),
  patternGuidance: z.string().optional(),
});

export const AnalysisOutputSchema = z.object({
  season: z.string(),
  seasonCharacterization: z.string(),
  seasonExplanation: z.string(),
  undertone: z.enum(["Warm", "Cool", "Neutral", "Olive"]),
  undertoneExplanation: z.string(),
  contrastLevel: z.enum(["High", "Medium", "Low"]),
  contrastLevelExplanation: z.string(),
  personalPalette: PersonalPaletteSchema,
  colorsToAvoid: z.array(ColorToAvoidSchema).length(3),
  primaryMetal: z.enum(["Gold", "Silver", "Bronze"]),
  metalTonesExplanation: z.string(),
  hairColorGuidance: z.object({
    lighterToneEffect: z
      .string()
      .describe(
        "Effect of going lighter, e.g., 'Your complexion will appear brighter.'"
      ),
    darkerToneEffect: z
      .string()
      .describe(
        "Effect of going darker, e.g., 'Your eyes will gain intensity.'"
      ),
    colorToAvoid: z
      .string()
      .describe("Specific hair color to avoid, e.g., 'Ashy blonde because...'"),
  }),
  hairColorExplanation: z.string(),
  styleScenarios: z.object({
    professional: StyleScenarioSchema,
    elegant: StyleScenarioSchema,
    casual: StyleScenarioSchema,
  }),
  makeupRecommendations: MakeupRecommendationsSchema.optional(),
  overallVibe: z.string(),
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
