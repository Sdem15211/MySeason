import { db } from "@/db";
import { analyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Metadata } from "next";

import { AnalysisResult } from "@/lib/ai"; // Assuming AnalysisResult type is defined here
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/features/analysis/copy-button"; // Assume this component exists or create later

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

interface StoredInputData {
  extractedFeatures: {
    averageEyeColorHex?: string;
    skinColorHex?: string;
    averageEyebrowColorHex?: string;
    skinUndertone?: string;
    contrast?: {
      skinEyeRatio?: number;
      skinHairRatio?: number;
      eyeHairRatio?: number;
      overall?: string;
    };
  };
  questionnaireData: {
    naturalHairColor?: string;
    // Add other questionnaire fields as needed
  };
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

  // Type assertion for result
  const result = analysisRecord.result as AnalysisResult;

  // Type assertion/parsing for input data (add Zod validation for robustness)
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
            <h3 className="text-lg font-semibold mb-2">Best Colors</h3>
            {result.palettes.bestColors.map((color) => (
              <ColorSwatch key={`best-${color}`} color={color} />
            ))}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Neutral Colors</h3>
            {result.palettes.neutralColors.map((color) => (
              <ColorSwatch key={`neutral-${color}`} color={color} />
            ))}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Accent Colors</h3>
            {result.palettes.accentColors.map((color) => (
              <ColorSwatch key={`accent-${color}`} color={color} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Input Data (Debug Section) */}
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
            {extractedFeatures?.averageEyebrowColorHex ? (
              <ColorSwatch
                color={extractedFeatures.averageEyebrowColorHex}
                label="Eyebrow"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Eyebrow Color: Not Available
              </p>
            )}
            {extractedFeatures?.skinUndertone ? (
              <p className="text-sm text-muted-foreground mt-2">
                Undertone: {extractedFeatures.skinUndertone}
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
            <h3 className="font-semibold">Clothing</h3>
            <p>{result.advice.clothing}</p>

            <h3 className="font-semibold">Makeup</h3>
            <p>{result.advice.makeup}</p>

            <h3 className="font-semibold">Accessories</h3>
            <p>{result.advice.accessories}</p>
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
