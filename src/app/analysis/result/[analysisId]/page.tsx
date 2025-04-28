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
  ArrowDown,
  ArrowUp,
  ArrowUp01,
  Briefcase,
  Gem,
  Info,
  Shirt,
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

interface StyleCardProps {
  description: string;
  scenario: string;
  colors: ColorInfo[];
  icon: React.ReactNode;
}

const StyleCard = ({ description, scenario, colors, icon }: StyleCardProps) => (
  <Card className="border-black/25 p-0">
    <CardContent className="p-5 space-y-2 relative">
      {icon}
      <p className="text-xs text-brown/60 font-medium">{scenario}</p>
      <p className="text-foreground text-sm tracking-tight leading-normal max-w-[90%]">
        {description}
      </p>
      <div className="flex items-center gap-2 mt-6">
        {colors.map((color) => (
          <div
            key={color.hex}
            className="size-8 rounded-md border border-black/10 shadow"
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

interface HairCardProps {
  description: string;
  title: string;
  icon: React.ReactNode;
  color?: ColorInfo;
}
const HairCard = ({ description, title, icon, color }: HairCardProps) => (
  <Card className="border-black/25 p-0">
    <CardContent className="p-5 space-y-2 relative">
      {icon}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-brown/60 font-medium">{title}</p>
        <p className="text-foreground text-sm tracking-tight leading-normal max-w-[90%]">
          {description}
        </p>
        {color && (
          <div
            className="w-20 h-20 rounded-xl border border-black/10 shadow mt-4"
            style={{ backgroundColor: color.hex }}
          />
        )}
      </div>
    </CardContent>
  </Card>
);

const metalGradients = {
  Gold: "linear-gradient(to top, #EDC700, #FFDD2A)",
  Silver: "linear-gradient(to top, #A8A8A8, #CCCCCC)",
  Bronze: "linear-gradient(to top, #EB9B82, #D4836A)",
};

interface MakeupCardProps {
  title: string;
  description: string;
  color: ColorInfo;
}

const MakeupCard = ({ title, description, color }: MakeupCardProps) => (
  <Card className="overflow-hidden w-full p-6">
    <CardHeader className="p-0 justify-start">
      <CardTitle className="text-xs text-brown/60 font-medium">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0 flex justify-between items-center">
      <p className="text-foreground text-sm tracking-tight leading-normal">
        {description}
      </p>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-20 h-20 rounded-xl border border-black/10 shadow"
          style={{ backgroundColor: color.hex }}
          title={`${color.name} (${color.hex})`}
        />
        <div className="flex gap-1 items-center">
          <p className="text-xs text-muted-foreground">{color.hex}</p>
          <CopyButton textToCopy={color.hex} />
        </div>
      </div>
    </CardContent>
  </Card>
);

interface MakeupColorCardProps {
  title: string;
  colors: ColorInfo[];
}

const MakeupColorCard = ({ title, colors }: MakeupColorCardProps) => (
  <Card className="overflow-hidden w-full p-6">
    <CardHeader className="p-0 justify-start mb-12">
      <CardTitle className="text-xs text-brown/60 font-medium">
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
  return (
    <div className="container mx-auto pt-24 pb-24 max-w-7xl px-4 lg:px-0">
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
        <TabsList className="flex lg:flex-col items-start justify-start bg-transparent gap-3 lg:w-[14rem] mb-8 lg:sticky lg:top-58">
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
              colors={result.powerColors}
            />
            <ColorListCard
              title="Colors to avoid 🚫"
              colors={result.colorsToAvoid}
            />
          </TabsContent>

          <TabsContent value="style" className="flex flex-col gap-16">
            <div className="flex flex-col gap-8">
              <p className="text-lg font-semibold text-brown tracking-tighter">
                Styling advice 😎
              </p>
              <div className="flex flex-col gap-8">
                <StyleCard
                  description={
                    result.styleScenarios.professional.colorCombinationAdvice
                  }
                  scenario="Professional"
                  colors={
                    result.styleScenarios.professional.colorCombinationColors
                  }
                  icon={
                    <Briefcase className="size-5 text-orange absolute top-5 right-5" />
                  }
                />
                <StyleCard
                  description={
                    result.styleScenarios.elegant.colorCombinationAdvice
                  }
                  scenario="Elegant"
                  colors={result.styleScenarios.elegant.colorCombinationColors}
                  icon={
                    <Gem className="size-5 text-orange absolute top-5 right-5" />
                  }
                />
                <StyleCard
                  description={
                    result.styleScenarios.casual.colorCombinationAdvice
                  }
                  scenario="Casual"
                  colors={result.styleScenarios.casual.colorCombinationColors}
                  icon={
                    <Shirt className="size-5 text-orange absolute top-5 right-5" />
                  }
                />
              </div>
            </div>
            <div className="w-full h-px bg-black/10" />
            <div className="flex flex-col gap-8">
              <p className="text-lg font-semibold text-brown tracking-tighter">
                Metal Recommendations 💎
              </p>
              <Card className="border-black/25 p-0">
                <CardContent className="p-5 space-y-2 flex gap-8 items-center">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-brown/60 font-medium">
                      Best matching metal color
                    </p>
                    <p className="text-xl font-semibold text-brown tracking-tighter mb-2">
                      {result.primaryMetal}
                    </p>
                    <p className="text-foreground text-sm tracking-tight leading-normal">
                      {result.metalTonesExplanation}
                    </p>
                  </div>
                  <div
                    className="size-20 rounded-xl border border-black/10 shadow shrink-0"
                    style={{
                      background:
                        metalGradients[
                          result.primaryMetal as keyof typeof metalGradients
                        ] || "#EEEEEE", // Fallback color
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="hair" className="flex flex-col gap-8">
            <p className="text-lg font-semibold text-brown tracking-tighter">
              Hair color advice 💇🏻‍♂ ️💇🏼‍♀️
            </p>
            <HairCard
              description={result.hairColorGuidance.lighterToneEffect}
              title="Going lighter"
              icon={
                <ArrowUp className="size-5 text-orange absolute top-5 right-5" />
              }
            />
            <HairCard
              description={result.hairColorGuidance.darkerToneEffect}
              title="Going darker"
              icon={
                <ArrowDown className="size-5 text-orange absolute top-5 right-5" />
              }
            />
            <HairCard
              color={result.hairColorGuidance.colorToAvoid.color}
              description={result.hairColorGuidance.colorToAvoid.explanation}
              title="Color to avoid"
              icon={
                <AlertCircle className="size-5 text-orange absolute top-5 right-5" />
              }
            />
          </TabsContent>

          {result.makeupRecommendations && (
            <TabsContent value="makeup" className="flex flex-col gap-10">
              <div className="flex flex-col gap-3 items-start">
                <h2 className="title text-brown">Makeup advice 💄</h2>
                <p className="text-muted-foreground text-sm tracking-tight leading-normal">
                  {result.makeupRecommendations.generalMakeupAdvice}
                </p>
              </div>
              <MakeupCard
                title="Foundation Undertone"
                description={
                  result.makeupRecommendations.foundationUndertoneGuidance
                    .description
                }
                color={
                  result.makeupRecommendations.foundationUndertoneGuidance.color
                }
              />
              <MakeupCard
                title="Blush"
                description={
                  result.makeupRecommendations.blushRecommendation.description
                }
                color={result.makeupRecommendations.blushRecommendation.color}
              />
              <MakeupColorCard
                title="Lip colors"
                colors={result.makeupRecommendations.complementaryLipColors}
              />
              <MakeupColorCard
                title="Eye colors"
                colors={result.makeupRecommendations.complementaryEyeColors}
              />
            </TabsContent>
          )}
        </div>

        <div className="w-full md:w-60 space-y-4 lg:sticky lg:top-58">
          {showSavePrompt && <SaveAnalysisPrompt />}
        </div>
      </Tabs>
    </div>
  );
}
