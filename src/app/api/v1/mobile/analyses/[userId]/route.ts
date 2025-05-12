import { NextResponse } from "next/server";
import { headers as getHeaders } from "next/headers";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { AnalysisOutput } from "@/lib/schemas/analysis-output.schema";

interface UserAnalysis {
  id: string;
  createdAt: Date;
  result: AnalysisOutput;
}

export const GET = async (
  request: Request,
  { params }: { params: { userId: string } }
) => {
  const { userId } = await params;

  try {
    const analysisResults = await db
      .select({
        id: analyses.id,
        createdAt: analyses.createdAt,
        result: analyses.result,
      })
      .from(analyses)
      .where(eq(analyses.userId, userId))
      .orderBy(desc(analyses.createdAt));

    const userAnalyses = analysisResults as UserAnalysis[];

    return NextResponse.json(userAnalyses);
  } catch (error) {
    console.error(
      `API Error: Failed fetching analyses for user ${userId}:`,
      error
    );
    return NextResponse.json(
      { error: "Could not fetch analyses." },
      { status: 500 }
    );
  }
};
