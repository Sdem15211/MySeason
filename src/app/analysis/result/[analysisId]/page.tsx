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
  Shirt,
  Paintbrush,
  Sparkles,
  XCircle,
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

interface InfoCardProps {
  title: string;
  value: string;
  explanation?: string;
  icon?: React.ElementType;
}

const CollapsibleInfoCard = ({
  title,
  value,
  explanation,
  icon: Icon = Info,
}: InfoCardProps) => (
  <Card className="border-black/25 p-0">
    <CardContent className="p-5">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="explanation" className="border-none">
          <AccordionTrigger className="p-0 w-full cursor-pointer">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1 items-start">
                <p className="text-xs text-brown/60 font-medium">{title}</p>
                <p className="text-xl font-semibold text-brown tracking-tighter">
                  {value}
                </p>
              </div>
              <Icon className="w-6 h-6 text-orange" />
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-sm tracking-tight leading-normal pt-6 pb-0">
            {explanation}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CardContent>
  </Card>
);

const OverallVibeCard = ({ vibe }: { vibe: string }) => (
  <Card className="border-black/25 p-0">
    <CardContent className="p-5 space-y-2">
      <p className="text-xs text-brown/60 font-medium">Overall vibe</p>
      <p className="text-foreground text-sm tracking-tight leading-normal">
        {vibe}
      </p>
    </CardContent>
  </Card>
);

const SaveAnalysisPrompt = () => (
  <Card className="bg-gradient-to-t from-[#ED6F3F] to-[#F48257] shadow-season lg:w-[14rem] w-full flex flex-col gap-4">
    <CardHeader className="flex flex-col items-start gap-3">
      <AlertCircle className="w-6 h-6 text-black" />
      <div className="flex flex-col gap-2">
        <CardTitle className="text-xl font-bold text-black tracking-tighter">
          Save your analysis
        </CardTitle>
        <CardDescription className="text-xs text-black">
          <span className="font-bold">Log in</span> or{" "}
          <span className="font-bold">Sign up for free</span> to save your
          analysis. This is the only way to view your analysis results later.
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent className="flex lg:flex-col gap-3 w-full">
      <Button asChild variant="secondary" className="flex-1">
        <Link href="/auth/signin">Log In</Link>
      </Button>
      <Button
        asChild
        variant="outline"
        className="bg-transparent hover:bg-white/20 flex-1"
      >
        <Link href="/auth/signup">Sign Up</Link>
      </Button>
    </CardContent>
  </Card>
);

interface ColorInfo {
  name: string;
  hex: string;
}

const ColorItem = ({ name, hex }: ColorInfo) => (
  <div className="flex items-center justify-between border-b border-black/10 pb-6 last:border-b-0 last:pb-0">
    <div className="flex items-start gap-8">
      <div
        className="w-20 h-20 rounded-xl border border-black/10 shadow"
        style={{ backgroundColor: hex }}
        title={`${name} (${hex})`}
      />
      <div className="flex flex-col gap-1 pt-2">
        <p className="title text-brown">{name}</p>
        <p className="text-xs text-muted-foreground">{hex}</p>
      </div>
    </div>
    <CopyButton textToCopy={hex} />
  </div>
);

interface ColorListCardProps {
  title: string;
  colors: ColorInfo[];
}

const ColorListCard = ({ title, colors }: ColorListCardProps) => (
  <Card className="overflow-hidden w-full p-6">
    <CardHeader className="p-0 justify-start mb-12">
      <CardTitle className="text-lg font-semibold text-brown tracking-tighter">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0 flex flex-col gap-6">
      {colors.map((color) => (
        <ColorItem key={color.hex} name={color.name} hex={color.hex} />
      ))}
    </CardContent>
  </Card>
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
    <div className="container mx-auto pt-24 pb-8 max-w-7xl px-4 lg:px-0">
      <div className="flex flex-col w-full items-center mb-8 lg:mb-12">
        <p className="subtitle">Your season is:</p>
        <h1 className="text-[2.5rem] font-bold mb-3 tracking-tighter text-brown">
          {result.season}
          <span className="ml-2">
            {result.season.includes("Spring")
              ? "🌸"
              : result.season.includes("Summer")
              ? "☀️"
              : result.season.includes("Autumn")
              ? "🍂"
              : "❄️"}
          </span>
        </h1>
      </div>
      <Tabs
        defaultValue="general"
        orientation="vertical"
        className="flex flex-col gap-12 lg:gap-0 lg:flex-row w-full justify-between items-center lg:items-start lg:px-6"
      >
        <TabsList className="flex lg:flex-col items-start justify-start bg-transparent gap-3 lg:w-[14rem] mb-8">
          <TabsTrigger
            value="general"
            className="px-4 py-5 data-[state=active]:bg-orange/15 bg-[#EEEEEE] data-[state=active]:text-orange text-sm"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="colors"
            className="px-4 py-5 data-[state=active]:bg-orange/15 bg-[#EEEEEE] data-[state=active]:text-orange text-sm"
          >
            Colors
          </TabsTrigger>
          <TabsTrigger
            value="style"
            className="px-4 py-5 data-[state=active]:bg-orange/15 bg-[#EEEEEE] data-[state=active]:text-orange text-sm"
          >
            Style
          </TabsTrigger>
          <TabsTrigger
            value="hair"
            className="px-4 py-5 data-[state=active]:bg-orange/15 bg-[#EEEEEE] data-[state=active]:text-orange text-sm"
          >
            Hair
          </TabsTrigger>
          {result.makeupRecommendations && (
            <TabsTrigger
              value="makeup"
              className="px-4 py-5 data-[state=active]:bg-orange/15 bg-[#EEEEEE] data-[state=active]:text-orange text-sm"
            >
              Makeup
            </TabsTrigger>
          )}
        </TabsList>

        <div className="max-w-[31.25rem] w-full">
          <TabsContent value="general" className="flex flex-col gap-10">
            <div className="flex flex-col gap-3 items-start">
              <h2 className="title text-brown">Why this season?</h2>
              <p className="text-muted-foreground text-sm tracking-tight leading-normal">
                {result.seasonExplanation}
              </p>
            </div>
            <div className="flex flex-col gap-8">
              <CollapsibleInfoCard
                title="Undertone"
                value={result.undertone}
                explanation={result.undertoneExplanation}
              />
              <CollapsibleInfoCard
                title="Contrast Level"
                value={result.contrastLevel}
                explanation={result.contrastLevelExplanation}
              />
              <OverallVibeCard vibe={result.overallVibe} />
            </div>
          </TabsContent>

          <TabsContent value="colors" className="flex flex-col gap-8 w-full">
            <ColorListCard
              title="Power colors ✨"
              colors={result.personalPalette?.powerColors ?? []}
            />
            <ColorListCard
              title="Colors to avoid 🚫"
              colors={result.colorsToAvoid?.map((item) => item.color) ?? []}
            />
          </TabsContent>
          <TabsContent value="style" className="mt-0">
            <Card>
              <CardHeader>Style Content Placeholder</CardHeader>
              <CardContent>Details about style go here.</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="hair" className="mt-0">
            <Card>
              <CardHeader>Hair Content Placeholder</CardHeader>
              <CardContent>Details about hair go here.</CardContent>
            </Card>
          </TabsContent>
          {result.makeupRecommendations && (
            <TabsContent value="makeup" className="mt-0">
              <Card>
                <CardHeader>Makeup Content Placeholder</CardHeader>
                <CardContent>Details about makeup go here.</CardContent>
              </Card>
            </TabsContent>
          )}
        </div>

        <div className="w-full md:w-60 space-y-4">
          {showSavePrompt && <SaveAnalysisPrompt />}
        </div>
      </Tabs>
      {/* <p className="mt-10 text-xs text-center text-muted-foreground">
        Analysis generated on:{" "}
        {analysisRecord.createdAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p> */}
    </div>
  );
}
