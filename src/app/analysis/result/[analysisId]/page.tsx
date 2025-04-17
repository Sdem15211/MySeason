import { db } from "@/db";
import { analyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Metadata } from "next";

import { AnalysisOutput } from "@/lib/schemas/analysis-output.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/features/analysis/copy-button"; // Assume this component exists or create later
import { ExtractedColors } from "@/lib/types/image-analysis.types";
import { QuestionnaireFormData } from "@/lib/schemas/questionnaire"; // Assuming this exists

interface AnalysisResultsPageProps {
  params: {
    analysisId: string;
  };
}

// Optional: Generate dynamic metadata
export async function generateMetadata({
  params,
}: AnalysisResultsPageProps): Promise<Metadata> {
  // You could fetch the analysis season name here for the title
  return {
    title: `Analysis Results - ${(await params).analysisId}`,
  };
}

// Helper component for rendering color swatches (placeholder)
const ColorSwatch = ({ color, label }: { color: string; label?: string }) => (
  <div className="inline-flex items-center mr-4 mb-2">
    <div
      className="w-8 h-8 rounded border border-muted mr-2 align-middle"
      style={{ backgroundColor: color }}
      title={color}
    />
    {label && <span className="text-sm text-muted-foreground">{label}</span>}
  </div>
);

// Updated interface to match the structure stored in the database (from API route)
interface StoredInputData {
  extractedFeatures: ExtractedColors & {
    contrast?: {
      skinEyeRatio?: number;
      skinHairRatio?: number;
      eyeHairRatio?: number;
      overall?: "High" | "Medium" | "Low";
    };
    calculatedUndertone?: string;
  };
  questionnaireData: QuestionnaireFormData;
}

export default async function AnalysisResultsPage({
  params,
}: AnalysisResultsPageProps) {
  const analysisId = (await params).analysisId;

  if (!analysisId) {
    console.error("AnalysisResultsPage: Missing analysisId in params");
    notFound();
  }

  let analysisRecord;
  try {
    // Fetch analysis result AND input data
    const analysisResults = await db
      .select({
        id: analyses.id,
        result: analyses.result,
        inputData: analyses.inputData,
        createdAt: analyses.createdAt,
      })
      .from(analyses)
      .where(eq(analyses.id, analysisId))
      .limit(1);

    analysisRecord = analysisResults[0];

    if (!analysisRecord) {
      console.log(
        `AnalysisResultsPage: Analysis not found for ID: ${analysisId}`
      );
      notFound();
    }
  } catch (error) {
    console.error(
      `AnalysisResultsPage: Database error fetching data for analysis ${analysisId}:`,
      error
    );
    // Render an error message or use an Error component
    return (
      <div className="container mx-auto px-4 py-8 text-center text-destructive">
        Error loading analysis results. Please try again later.
      </div>
    );
  }

  if (!analysisRecord?.result || !analysisRecord?.inputData) {
    console.log(
      `AnalysisResultsPage: Analysis result or input data missing for ID: ${analysisId}`
    );
    notFound();
  }

  // Use the correct type for the result
  const result = analysisRecord.result as AnalysisOutput;

  // Use the updated interface (add Zod validation later for robustness)
  const inputData = analysisRecord.inputData as StoredInputData;
  const extractedFeatures = inputData.extractedFeatures ?? {};
  const questionnaireData = inputData.questionnaireData ?? {};

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4 text-center">
        Your Personal Color Analysis
      </h1>
      <p className="text-center text-muted-foreground mb-8">
        Analysis ID: {analysisRecord.id}{" "}
        <CopyButton textToCopy={analysisRecord.id} />
      </p>

      {/* Season Result */}
      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-background">
        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-center text-primary">
            Your Season: {result.season}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Color Palettes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Color Palettes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Wow Colors</h3>
            {result.personalPalette.wowColors.map(({ name, hex }) => (
              <ColorSwatch key={`wow-${hex}`} color={hex} label={name} />
            ))}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Best Neutrals</h3>
            {result.personalPalette.bestNeutrals.map(({ name, hex }) => (
              <ColorSwatch key={`neutral-${hex}`} color={hex} label={name} />
            ))}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Accent Colors</h3>
            {result.personalPalette.accentColors.map(({ name, hex }) => (
              <ColorSwatch key={`accent-${hex}`} color={hex} label={name} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Explanations Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Analysis Details & Explanations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p>
              <strong>Season:</strong> {result.season} -{" "}
              <em>{result.seasonExplanation}</em>
            </p>
          </div>
          <div>
            <p>
              <strong>Undertone:</strong> {result.undertone} -{" "}
              <em>{result.undertoneExplanation}</em>
            </p>
          </div>
          <div>
            <p>
              <strong>Contrast Level:</strong> {result.contrastLevel} -{" "}
              <em>{result.contrastLevelExplanation}</em>
            </p>
          </div>
          <div>
            <p>
              <strong>Palette Rationale:</strong>{" "}
              <em>{result.paletteExplanation}</em>
            </p>
          </div>
          <div>
            <h3 className="text-md font-semibold mb-1 text-foreground">
              Colors to Minimize
            </h3>
            <div className="mb-2">
              {result.colorsToMinimize.map(({ name, hex }) => (
                <ColorSwatch key={`minimize-${hex}`} color={hex} label={name} />
              ))}
            </div>
            <p>
              <em>{result.colorsToMinimizeExplanation}</em>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Input Data (Debug Section) - Updated to use extractedFeatures fields */}
      <Card className="mb-6 border-dashed border-amber-500">
        <CardHeader>
          <CardTitle className="text-amber-600">Input Data (Debug)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-muted-foreground">
              Extracted Features
            </h3>
            {extractedFeatures?.skinColorHex ? (
              <ColorSwatch
                color={extractedFeatures.skinColorHex}
                label="Skin"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Skin Color: Not Available
              </p>
            )}
            {extractedFeatures?.averageEyeColorHex ? (
              <ColorSwatch
                color={extractedFeatures.averageEyeColorHex}
                label="Eye"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Eye Color: Not Available
              </p>
            )}
            {/* Display calculatedUndertone if present */}
            {extractedFeatures?.calculatedUndertone ? (
              <p className="text-sm text-muted-foreground mt-2">
                Calculated Undertone (Input):{" "}
                {extractedFeatures.calculatedUndertone}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                Undertone: Not Available
              </p>
            )}
            {/* Display Contrast Ratios if available */}
            {extractedFeatures?.contrast && (
              <div className="mt-2 text-xs text-muted-foreground">
                Contrast (Skin/Eye:{" "}
                {extractedFeatures.contrast.skinEyeRatio?.toFixed(2) ?? "N/A"},
                Skin/Hair:{" "}
                {extractedFeatures.contrast.skinHairRatio?.toFixed(2) ?? "N/A"},
                Eye/Hair:{" "}
                {extractedFeatures.contrast.eyeHairRatio?.toFixed(2) ?? "N/A"},
                Overall: {extractedFeatures.contrast.overall ?? "N/A"})
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-muted-foreground">
              Questionnaire Data
            </h3>
            {questionnaireData?.naturalHairColor ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Natural Hair Color:{" "}
                </p>
                <ColorSwatch color={questionnaireData.naturalHairColor} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Natural Hair Color: Not Provided
              </p>
            )}
            {/* Add other questionnaire fields here if needed */}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Advice */}
      <Card>
        <CardHeader>
          <CardTitle>Personalized Advice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <h3 className="font-semibold">Overall Vibe</h3>
            <p>{result.overallVibe}</p>

            <h3 className="font-semibold">Style & Combining Advice</h3>
            <p>{result.styleAndCombiningAdvice}</p>
            <p className="text-sm">
              (<em>{result.styleAndCombiningExplanation}</em>)
            </p>

            <h3 className="font-semibold">Hair Color Guidance</h3>
            <p>{result.hairColorGuidance}</p>
            <p className="text-sm">
              (<em>{result.hairColorExplanation}</em>)
            </p>

            <h3 className="font-semibold">Best Metal Tones</h3>
            <p>{result.bestMetalTones.join(", ")}</p>
            <p className="text-sm">
              (<em>{result.metalTonesExplanation}</em>)
            </p>

            {/* Conditionally render Makeup section */}
            {result.makeupRecommendations && (
              <>
                <h3 className="font-semibold">Makeup Recommendations</h3>
                <p>
                  <strong>Foundation:</strong>{" "}
                  {result.makeupRecommendations.foundationFocus}
                </p>
                <p>
                  <strong>Blush:</strong>{" "}
                  {result.makeupRecommendations.blushFamilies.join(", ")}
                </p>
                <p>
                  <strong>Lipstick:</strong>{" "}
                  {result.makeupRecommendations.lipstickFamilies.join(", ")}
                </p>
                <p>
                  <strong>Eyeshadow:</strong>{" "}
                  {result.makeupRecommendations.eyeshadowTones.join(", ")}
                </p>
                <p className="text-sm">
                  (<em>{result.makeupRecommendations.makeupExplanation}</em>)
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="mt-10 text-sm text-center text-muted-foreground">
        Remember to save your Analysis ID ({analysisRecord.id}) or bookmark this
        page!
      </p>
    </div>
  );
}
