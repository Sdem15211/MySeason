import { z } from "zod";

const ColorInfoSchema = z.object({
  name: z.string(),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format"),
});

const MakeupCardSchema = z.object({
  description: z.string(),
  color: ColorInfoSchema,
});

const MakeupRecommendationsSchema = z.object({
  generalMakeupAdvice: z.string().describe("General advice for makeup choices"),
  foundationUndertoneGuidance: MakeupCardSchema,
  blushRecommendation: MakeupCardSchema,
  complementaryLipColors: z.array(ColorInfoSchema).min(2).max(3),
  complementaryEyeColors: z.array(ColorInfoSchema).min(2).max(3),
});

const StyleScenarioSchema = z.object({
  colorCombinationAdvice: z.string(),
  colorCombinationColors: z.array(ColorInfoSchema).length(2),
});

export const AnalysisOutputSchema = z.object({
  season: z.string().describe("One of the 12 seasons"),
  seasonExplanation: z.string().describe("Explanation of the season"),
  undertone: z.enum(["Warm", "Cool", "Neutral", "Olive"]),
  undertoneExplanation: z.string().describe("Explanation of the undertone"),
  contrastLevel: z.enum(["High", "Medium", "Low"]),
  contrastLevelExplanation: z
    .string()
    .describe("Explanation of the contrast level"),
  overallVibe: z.string(),
  powerColors: z.array(ColorInfoSchema).length(5),
  colorsToAvoid: z.array(ColorInfoSchema).length(3),
  primaryMetal: z.enum(["Gold", "Silver", "Bronze"]),
  metalTonesExplanation: z.string(),
  styleScenarios: z.object({
    professional: StyleScenarioSchema,
    elegant: StyleScenarioSchema,
    casual: StyleScenarioSchema,
  }),
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
    colorToAvoid: z.object({
      color: ColorInfoSchema,
      explanation: z.string(),
    }),
  }),
  makeupRecommendations: MakeupRecommendationsSchema.optional(),
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
