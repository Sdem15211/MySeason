import { z } from "zod";

const ColorInfoSchema = z.object({
  name: z.string(),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format"),
});

const PersonalPaletteSchema = z.object({
  wowColors: z.array(ColorInfoSchema).length(5),
  bestNeutrals: z.array(ColorInfoSchema).length(3),
  accentColors: z.array(ColorInfoSchema).min(1).max(3),
});

const MakeupRecommendationsSchema = z.object({
  foundationFocus: z.string(),
  blushFamilies: z.array(z.string()),
  lipstickFamilies: z.array(z.string()),
  eyeshadowTones: z.array(z.string()),
  makeupExplanation: z.string(),
});

export const AnalysisOutputSchema = z.object({
  season: z.string(),
  seasonExplanation: z.string(),
  undertone: z.enum(["Warm", "Cool", "Neutral", "Olive"]),
  undertoneExplanation: z.string(),
  contrastLevel: z.enum(["High", "Medium", "Low"]),
  contrastLevelExplanation: z.string(),
  personalPalette: PersonalPaletteSchema,
  paletteExplanation: z.string(),
  colorsToMinimize: z.array(ColorInfoSchema).min(2).max(4),
  colorsToMinimizeExplanation: z.string(),
  bestMetalTones: z.array(z.string()),
  metalTonesExplanation: z.string(),
  hairColorGuidance: z.string(),
  hairColorExplanation: z.string(),
  makeupRecommendations: MakeupRecommendationsSchema.optional(),
  styleAndCombiningAdvice: z.string(),
  styleAndCombiningExplanation: z.string(),
  overallVibe: z.string(),
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
