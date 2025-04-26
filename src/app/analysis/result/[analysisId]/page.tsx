import { db } from "@/db";
import { analyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { headers as getHeaders } from "next/headers";
import { auth } from "@/lib/auth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/features/analysis/copy-button";
import { AnalysisOutput } from "@/lib/schemas/analysis-output.schema";
import { ExtractedColors } from "@/lib/types/image-analysis.types";
import { QuestionnaireFormData } from "@/lib/schemas/questionnaire";
import {
  AlertCircle,
  Info,
  Palette,
  Sparkles,
  XCircle,
  ArrowUp,
  ArrowDown,
  Briefcase,
  Gem,
  Shirt,
  UserPlus,
} from "lucide-react";

interface AnalysisResultsPageProps {
  params: {
    analysisId: string;
  };
}

export async function generateMetadata({
  params,
}: AnalysisResultsPageProps): Promise<Metadata> {
  const analysisId = (await params).analysisId;
  // Fetch analysis for title - basic error handling
  try {
    const analysisResults = await db
      .select({ result: analyses.result })
      .from(analyses)
      .where(eq(analyses.id, analysisId))
      .limit(1);
    const resultData = analysisResults[0]
      ?.result as Partial<AnalysisOutput> | null;
    const season = resultData?.season || "Your";
    return {
      title: `${season} Season - Color Analysis Results`,
    };
  } catch {
    return { title: `Analysis Results - ${analysisId}` };
  }
}

const ColorSwatch = ({
  hex,
  name,
  className,
}: {
  hex: string;
  name?: string;
  className?: string;
}) => (
  <div
    className={`inline-flex items-center mr-3 mb-2 p-1 pr-3 rounded-full border bg-secondary/30 ${className}`}
  >
    <div
      className="w-6 h-6 rounded-full border border-muted mr-2 shadow-inner"
      style={{ backgroundColor: hex }}
      title={`${name || "Color"} (${hex})`}
    />
    {name && <span className="text-xs font-medium">{name}</span>}
  </div>
);

const ExplanationAccordion = ({
  text,
  triggerText = "Show me why...",
}: {
  text: string;
  triggerText?: string;
}) => (
  <Accordion type="single" collapsible className="w-full mt-1">
    <AccordionItem value="explanation" className="border-none">
      <AccordionTrigger className="text-xs font-medium text-muted-foreground hover:no-underline p-0 h-auto [&[data-state=open]>svg]:rotate-0">
        <span className="mr-1">{triggerText}</span>
      </AccordionTrigger>
      <AccordionContent className="pt-1 text-xs text-muted-foreground italic">
        {text}
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

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
  const headers = await getHeaders();

  if (!analysisId) {
    console.error("AnalysisResultsPage: Missing analysisId in params");
    notFound();
  }

  let analysisRecord;
  let authSession;
  try {
    const sessionPromise = auth.api.getSession({ headers });

    const analysisResults = await db
      .select({
        id: analyses.id,
        result: analyses.result,
        inputData: analyses.inputData,
        createdAt: analyses.createdAt,
        userId: analyses.userId,
      })
      .from(analyses)
      .where(eq(analyses.id, analysisId))
      .limit(1);

    analysisRecord = analysisResults[0];

    try {
      authSession = await sessionPromise;
      console.log(
        `Auth session retrieved for analysis page ${analysisId}. User ID: ${
          authSession?.user?.id ?? "Not logged in"
        }`
      );
    } catch (authError) {
      console.error(
        `Error fetching auth session on analysis page ${analysisId}:`,
        authError
      );
      authSession = null;
    }

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
    return (
      <div className="container mx-auto px-4 py-8 text-center text-destructive">
        <AlertCircle className="inline-block mr-2" />
        Error loading analysis results. Please try again later.
      </div>
    );
  }

  if (!analysisRecord?.result || !analysisRecord?.inputData) {
    console.log(
      `AnalysisResultsPage: Analysis result or input data is null/missing for ID: ${analysisId}`
    );
    notFound();
  }

  const isAnonymousUser = authSession?.user?.isAnonymous === true;
  const analysisBelongsToCurrentUser =
    !!analysisRecord.userId && analysisRecord.userId === authSession?.user?.id;
  const showSavePrompt = isAnonymousUser && analysisBelongsToCurrentUser;

  const result = analysisRecord.result as AnalysisOutput;
  const inputData = analysisRecord.inputData as StoredInputData;
  const extractedFeatures = inputData.extractedFeatures ?? {};
  const questionnaireData = inputData.questionnaireData ?? {};

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">
          Your Personal Color Analysis
        </h1>
        <p className="text-sm text-muted-foreground">
          Analysis ID: {analysisRecord.id}{" "}
          <CopyButton textToCopy={analysisRecord.id} />
        </p>
      </div>

      {/* Save Analysis Prompt (Conditional) */}
      {showSavePrompt && (
        <Card className="bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800 shadow-md">
          <CardHeader className="flex-row items-start sm:items-center gap-3 space-y-0">
            <UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1 sm:mt-0" />
            <div className="flex-grow">
              <CardTitle className="text-lg text-blue-800 dark:text-blue-200">
                Save Your Analysis
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Create a free account or log in to save this analysis
                permanently.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/auth/signup">Create Account</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/auth/signin">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Season Title & Characterization */}
      <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/30 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-semibold text-primary">
            {result.season}
          </CardTitle>
          <CardDescription className="text-lg text-foreground/80 pt-1">
            {result.seasonCharacterization}
          </CardDescription>
        </CardHeader>
        {/* Season Explanation - now uses accordion */}
        <CardContent className="text-center">
          <ExplanationAccordion
            text={result.seasonExplanation}
            triggerText="Learn more about this season..."
          />
        </CardContent>
      </Card>

      {/* Color Palettes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette size={20} /> Your Color Palette
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-md font-semibold mb-3 text-primary">
              Power Colors
            </h3>
            {result.personalPalette.powerColors.map(({ name, hex }) => (
              <ColorSwatch key={`power-${hex}`} hex={hex} name={name} />
            ))}
          </div>

          {/* Optional: Additional Compatible Colors */}
          {result.personalPalette.additionalCompatibleColors &&
            result.personalPalette.additionalCompatibleColors.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem
                  value="additional-colors"
                  className="border-none"
                >
                  <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:no-underline pt-0">
                    Show Additional Compatible Colors...
                  </AccordionTrigger>
                  <AccordionContent className="pt-3">
                    {result.personalPalette.additionalCompatibleColors.map(
                      ({ name, hex }) => (
                        <ColorSwatch
                          key={`additional-${hex}`}
                          hex={hex}
                          name={name}
                        />
                      )
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
        </CardContent>
      </Card>

      {/* Colors to Avoid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle size={20} /> Colors to Avoid
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {result.colorsToAvoid.map(({ color, explanation }, index) => (
              <AccordionItem key={`avoid-${index}`} value={`item-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <ColorSwatch hex={color.hex} name={color.name} />
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pl-4 border-l-2 border-border ml-2">
                  <strong>Why?</strong> {explanation}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Metal Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={20} /> Metal Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">{result.primaryMetal}</p>
          <ExplanationAccordion text={result.metalTonesExplanation} />
        </CardContent>
      </Card>

      {/* Hair Color Guidance */}
      <Card>
        <CardHeader>
          <CardTitle>Hair Color Guidance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="prose prose-sm max-w-none dark:prose-invert text-foreground space-y-2">
            <div className="flex items-start gap-2">
              <ArrowUp size={16} className="mt-1 flex-shrink-0" />
              <span>
                <strong>Lighter Tone:</strong>{" "}
                {result.hairColorGuidance.lighterToneEffect}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowDown size={16} className="mt-1 flex-shrink-0" />
              <span>
                <strong>Darker Tone:</strong>{" "}
                {result.hairColorGuidance.darkerToneEffect}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <XCircle size={16} className="mt-1 flex-shrink-0" />
              <span>
                <strong>Color to Avoid:</strong>{" "}
                {result.hairColorGuidance.colorToAvoid}
              </span>
            </div>
          </div>
          <ExplanationAccordion text={result.hairColorExplanation} />
        </CardContent>
      </Card>

      {/* Style Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Style Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="professional" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="professional" className="gap-1">
                <Briefcase size={16} /> Professional
              </TabsTrigger>
              <TabsTrigger value="elegant" className="gap-1">
                <Gem size={16} /> Elegant
              </TabsTrigger>
              <TabsTrigger value="casual" className="gap-1">
                <Shirt size={16} /> Casual
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="professional"
              className="pt-4 prose prose-sm max-w-none dark:prose-invert text-foreground"
            >
              <p>{result.styleScenarios.professional.colorCombinationAdvice}</p>
              {result.styleScenarios.professional.patternGuidance && (
                <p className="text-xs text-muted-foreground">
                  (Pattern Tip:{" "}
                  {result.styleScenarios.professional.patternGuidance})
                </p>
              )}
            </TabsContent>
            <TabsContent
              value="elegant"
              className="pt-4 prose prose-sm max-w-none dark:prose-invert text-foreground"
            >
              <p>{result.styleScenarios.elegant.colorCombinationAdvice}</p>
              {result.styleScenarios.elegant.patternGuidance && (
                <p className="text-xs text-muted-foreground">
                  (Pattern Tip: {result.styleScenarios.elegant.patternGuidance})
                </p>
              )}
            </TabsContent>
            <TabsContent
              value="casual"
              className="pt-4 prose prose-sm max-w-none dark:prose-invert text-foreground"
            >
              <p>{result.styleScenarios.casual.colorCombinationAdvice}</p>
              {result.styleScenarios.casual.patternGuidance && (
                <p className="text-xs text-muted-foreground">
                  (Pattern Tip: {result.styleScenarios.casual.patternGuidance})
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Makeup Recommendations (Conditional) */}
      {result.makeupRecommendations && (
        <Card>
          <CardHeader>
            <CardTitle>Makeup Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Foundation Undertone:</strong>{" "}
              {result.makeupRecommendations.foundationUndertoneGuidance}
            </p>
            <p>
              <strong>Blush:</strong>{" "}
              {result.makeupRecommendations.blushRecommendation}
            </p>
            <p>
              <strong>Lip Colors:</strong>{" "}
              {result.makeupRecommendations.complementaryLipColors.join(", ")}
            </p>
            <p>
              <strong>Eye Colors:</strong>{" "}
              {result.makeupRecommendations.complementaryEyeColors.join(", ")}
            </p>
            <ExplanationAccordion
              text={result.makeupRecommendations.makeupExplanation}
            />
          </CardContent>
        </Card>
      )}

      {/* Analysis Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info size={20} /> Analysis Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="mb-1">
              <strong>Undertone:</strong> {result.undertone}
            </p>
            <ExplanationAccordion text={result.undertoneExplanation} />
          </div>
          <div>
            <p className="mb-1">
              <strong>Contrast Level:</strong> {result.contrastLevel}
            </p>
            <ExplanationAccordion text={result.contrastLevelExplanation} />
          </div>
          <p>
            <strong>Overall Vibe:</strong> {result.overallVibe}
          </p>
        </CardContent>
      </Card>

      {/* Input Data (Debug Section - Keep as is for now) */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="debug-info"
          className="border rounded-lg px-4 bg-muted/30"
        >
          <AccordionTrigger className="text-sm font-medium text-amber-600 hover:no-underline">
            Input Data (Debug Info)
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <div>
              <h3 className="text-md font-semibold mb-2 text-muted-foreground">
                Extracted Features
              </h3>
              {extractedFeatures?.skinColorHex ? (
                <ColorSwatch hex={extractedFeatures.skinColorHex} name="Skin" />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Skin Color: Not Available
                </p>
              )}
              {extractedFeatures?.averageEyeColorHex ? (
                <ColorSwatch
                  hex={extractedFeatures.averageEyeColorHex}
                  name="Eye"
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Eye Color: Not Available
                </p>
              )}
              {extractedFeatures?.averageEyebrowColorHex && (
                <ColorSwatch
                  hex={extractedFeatures.averageEyebrowColorHex}
                  name="Eyebrow"
                />
              )}
              {extractedFeatures?.averageLipColorHex && (
                <ColorSwatch
                  hex={extractedFeatures.averageLipColorHex}
                  name="Lip"
                />
              )}
              {extractedFeatures?.calculatedUndertone && (
                <p className="text-xs text-muted-foreground mt-2">
                  Calculated Undertone (Input):{" "}
                  {extractedFeatures.calculatedUndertone}
                </p>
              )}
              {extractedFeatures?.contrast && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Contrast (Skin/Eye:{" "}
                  {extractedFeatures.contrast.skinEyeRatio?.toFixed(2) ?? "N/A"}
                  , Skin/Hair:{" "}
                  {extractedFeatures.contrast.skinHairRatio?.toFixed(2) ??
                    "N/A"}
                  , Eye/Hair:{" "}
                  {extractedFeatures.contrast.eyeHairRatio?.toFixed(2) ?? "N/A"}
                  , Overall: {extractedFeatures.contrast.overall ?? "N/A"})
                </div>
              )}
            </div>
            <div>
              <h3 className="text-md font-semibold mb-2 text-muted-foreground">
                Questionnaire Data
              </h3>
              {questionnaireData?.naturalHairColor ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Natural Hair Color:{" "}
                  </p>
                  <ColorSwatch hex={questionnaireData.naturalHairColor} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Natural Hair Color: Not Provided
                </p>
              )}
              {/* Add other questionnaire fields here if needed for debug */}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Footer */}
      <p className="mt-10 text-sm text-center text-muted-foreground">
        {showSavePrompt
          ? "Create an account to save your analysis and access it anytime."
          : `Remember to save your Analysis ID (${analysisRecord.id}) or bookmark this page!`}
      </p>
    </div>
  );
}
