import { db } from "@/db";
import { analyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { headers as getHeaders } from "next/headers";
import { auth } from "@/lib/auth";
import { AnalysisOutput } from "@/lib/schemas/analysis-output.schema";
import { AlertCircle } from "lucide-react";
import { AnalysisResultsClient } from "@/components/features/analysis/analysis-results-client";

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

  // Prepare props for the client component
  const clientProps = {
    result,
    showSavePrompt,
  };

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
      <AnalysisResultsClient {...clientProps} />
    </div>
  );
}
