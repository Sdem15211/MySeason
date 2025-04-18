import { z } from "zod";

const ColorInfoSchema = z.object({
  name: z.string(),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format"),
});

const PersonalPaletteSchema = z.object({
  powerColors: z.array(ColorInfoSchema).min(2).max(5),
  additionalCompatibleColors: z.array(ColorInfoSchema).min(3).max(5).optional(),
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
  primaryMetal: z.string(),
  metalTonesExplanation: z.string(),
  hairColorGuidance: z.string(),
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
