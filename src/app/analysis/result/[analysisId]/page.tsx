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
const ColorSwatch = ({ color }: { color: string }) => (
  <div
    className="w-10 h-10 rounded mr-2 mb-2 border border-muted inline-block align-middle"
    style={{ backgroundColor: color }}
    title={color}
  />
);

export default async function AnalysisResultsPage({
  params,
}: AnalysisResultsPageProps) {
  const analysisId = (await params).analysisId;

  if (!analysisId) {
    console.error("AnalysisResultsPage: Missing analysisId in params");
    notFound();
  }

  let analysisData;
  try {
    const results = await db
      .select({
        id: analyses.id,
        result: analyses.result,
        createdAt: analyses.createdAt,
      })
      .from(analyses)
      .where(eq(analyses.id, analysisId))
      .limit(1);

    analysisData = results[0];
  } catch (error) {
    console.error(
      `AnalysisResultsPage: Database error fetching analysis ${analysisId}:`,
      error
    );
    // Render an error message or use an Error component
    return (
      <div className="container mx-auto px-4 py-8 text-center text-destructive">
        Error loading analysis results. Please try again later.
      </div>
    );
  }

  if (!analysisData || !analysisData.result) {
    console.log(
      `AnalysisResultsPage: Analysis not found for ID: ${analysisId}`
    );
    notFound();
  }

  // Type assertion - Ensure the result matches the expected schema
  // Add runtime validation (e.g., Zod) here for robustness if needed
  const result = analysisData.result as AnalysisResult;

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4 text-center">
        Your Personal Color Analysis
      </h1>
      <p className="text-center text-muted-foreground mb-8">
        Analysis ID: {analysisData.id}{" "}
        <CopyButton textToCopy={analysisData.id} />
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
        Remember to save your Analysis ID ({analysisData.id}) or bookmark this
        page!
      </p>
    </div>
  );
}
