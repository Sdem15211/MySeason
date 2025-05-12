import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import { auth } from "@/lib/auth";
import { AnalysisOutput } from "@/lib/schemas/analysis-output.schema";
import { withErrorHandler } from "@/lib/api-helpers";

interface Params {
  analysisId: string;
}

async function handler(request: NextRequest, { params }: { params: Params }) {
  const { analysisId } = await params;

  if (!analysisId) {
    return NextResponse.json(
      { error: { message: "analysisId is required", status: 400 } },
      { status: 400 }
    );
  }
  const analysisResults = await db
    .select({
      id: analyses.id,
      result: analyses.result,
      userId: analyses.userId,
    })
    .from(analyses)
    .where(eq(analyses.id, analysisId))
    .limit(1);

  const analysisRecord = analysisResults[0];

  if (!analysisRecord) {
    return NextResponse.json(
      { error: { message: "Analysis not found", status: 404 } },
      { status: 404 }
    );
  }

  if (!analysisRecord.result) {
    // This case implies data inconsistency if an analysis record exists but has no result.
    console.error(`API: Analysis result is null/missing for ID: ${analysisId}`);
    return NextResponse.json(
      { error: { message: "Analysis data incomplete", status: 500 } },
      { status: 500 }
    );
  }

  // Assuming result is already in the correct AnalysisOutput format
  const analysisUserId = analysisRecord.userId;
  const resultData = analysisRecord.result as AnalysisOutput;

  return NextResponse.json({
    result: resultData,
    userId: analysisUserId,
  });
}

export const GET = withErrorHandler(handler);

// Basic OPTIONS handler for CORS preflight requests if needed in the future.
// For now, Next.js handles this fairly well for simple cases.
// export async function OPTIONS() {
//   return new NextResponse(null, {
//     status: 204,
//     headers: {
//       "Access-Control-Allow-Origin": "*", // Adjust as needed for security
//       "Access-Control-Allow-Methods": "GET, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type, Authorization",
//     },
//   });
// }
