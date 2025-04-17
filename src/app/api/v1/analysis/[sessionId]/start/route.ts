import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, analyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { AnalysisResult, generateAnalysis } from "@/lib/ai";
import { extractFacialColors } from "@/lib/image-analysis";
import {
  StoredLandmarks,
  ExtractedColors,
} from "@/lib/types/image-analysis.types";
// import { del } from '@vercel/blob'; // Uncomment if cleanup needed

// Define a more specific type for questionnaire data if possible
// Example structure - adjust based on actual questionnaire fields
interface QuestionnaireData {
  gender?: string | null;
  age?: number | null;
  naturalHairColor?: string | null;
  sunReaction?: string | null;
  veinColor?: string | null;
  jewelryPreference?: string | null;
  flatteringColors?: string[] | string | null; // Allow string if free text
  unflatteringColors?: string[] | string | null;
  // Add other fields as necessary
}

interface RouteParams {
  params: {
    sessionId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const sessionId = (await params).sessionId;
  console.log(`Received POST start request for session ${sessionId}`);

  if (!sessionId) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_SESSION_ID",
        message: "Session ID required.",
      },
      { status: 400 }
    );
  }

  let session;
  try {
    // --- 1. Fetch Session and Verify Status ---
    const results = await db
      .select({
        id: sessions.id,
        status: sessions.status,
        imageBlobUrl: sessions.imageBlobUrl,
        faceLandmarks: sessions.faceLandmarks,
        questionnaireData: sessions.questionnaireData,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    session = results[0];

    if (!session) {
      console.error(`Start analysis: Session not found for ID: ${sessionId}`);
      return NextResponse.json(
        { success: false, error: "SESSION_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check expiry
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      console.log(`Start analysis: Session ${sessionId} has expired.`);
      // Consider updating status to 'expired' here?
      return NextResponse.json(
        { success: false, error: "SESSION_EXPIRED" },
        { status: 410 }
      );
    }

    // Check status - Should be 'questionnaire_complete' to start
    if (session.status !== "questionnaire_complete") {
      console.warn(
        `Start analysis: Session ${sessionId} has invalid status: ${session.status}. Expected 'questionnaire_complete'.`
      );
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_SESSION_STATE",
          message: `Session status is ${session.status}`,
        },
        { status: 409 }
      );
    }

    // Check for required data
    if (!session.imageBlobUrl) {
      console.error(
        `Start analysis: Missing imageBlobUrl for session ${sessionId}`
      );
      throw new Error("Session is missing the image blob URL.");
    }
    if (!session.faceLandmarks) {
      console.error(
        `Start analysis: Missing faceLandmarks for session ${sessionId}`
      );
      throw new Error("Session is missing face landmark data.");
    }
    if (!session.questionnaireData) {
      console.error(
        `Start analysis: Missing questionnaireData for session ${sessionId}`
      );
      throw new Error("Session is missing the questionnaire data.");
    }

    // --- 2. Update Status to Pending/Running ---
    await db
      .update(sessions)
      .set({ status: "analysis_pending", updatedAt: new Date() })
      .where(eq(sessions.id, sessionId));
    console.log(`Session ${sessionId} status updated to analysis_pending.`);

    // --- 3. Perform Analysis ---
    let analysisResult: AnalysisResult | null = null;
    let finalAnalysisId: string | null = null;

    try {
      console.log(`Starting analysis pipeline for session ${sessionId}...`);

      // --- 3a. Download Image ---
      console.log(`   - Downloading image from: ${session.imageBlobUrl}`);
      const imageResponse = await fetch(session.imageBlobUrl as string);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download image: ${imageResponse.statusText}`
        );
      }
      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(imageArrayBuffer);
      console.log(`   - Image downloaded successfully.`);

      // --- 3b. Image Processing (Facial Color Extraction) ---
      const landmarks = session.faceLandmarks as StoredLandmarks;
      // Call the renamed function
      const extractedData: ExtractedColors = await extractFacialColors(
        imageBuffer,
        landmarks
      );
      console.log(
        `   - Extracted facial data for session ${sessionId}:`,
        extractedData // Log the whole object
      );

      // --- 3c. LLM Analysis ---
      console.log(`   - Calling LLM analysis...`);

      // Safely cast questionnaireData after validation
      const validatedQuestionnaireData =
        session.questionnaireData as QuestionnaireData;

      analysisResult = await generateAnalysis({
        extractedColors: {
          skinColorHex: extractedData.skinColorHex,
          averageEyeColorHex: extractedData.averageEyeColorHex,
          skinUndertone: extractedData.skinUndertone,
          averageEyebrowColorHex: extractedData.averageEyebrowColorHex, // Pass eyebrow color
        },
        questionnaireAnswers: validatedQuestionnaireData as Record<
          string,
          string | number | boolean
        >,
      });
      console.log(`   - LLM analysis complete.`);

      // --- 3d. Store Result in 'analyses' Table ---
      console.log(`   - Storing analysis result in database...`);
      const newAnalysisId = generateUUID();
      await db.insert(analyses).values({
        id: newAnalysisId,
        result: analysisResult,
      });
      finalAnalysisId = newAnalysisId;
      console.log(`   - Analysis result stored with ID: ${finalAnalysisId}`);

      // --- 4. Update Session Status to Complete ---
      await db
        .update(sessions)
        .set({
          status: "analysis_complete",
          analysisId: finalAnalysisId,
          updatedAt: new Date(),
          // Optionally clear temporary data here
          // faceLandmarks: null,
          // questionnaireData: null,
        })
        .where(eq(sessions.id, sessionId));
      console.log(`Session ${sessionId} status updated to analysis_complete.`);

      // --- 5. Cleanup (Optional - Placeholder) ---
      // console.log(`   - Deleting blob: ${session.imageBlobUrl}`);
      // await del(session.imageBlobUrl); // Requires import { del } from '@vercel/blob';
      // If clearing data in step 4, no need to update again here.
    } catch (pipelineError) {
      console.error(
        `Analysis pipeline failed for session ${sessionId}:`,
        pipelineError
      );
      // --- 4b. Update Session Status to Failed ---
      await db
        .update(sessions)
        .set({ status: "analysis_failed", updatedAt: new Date() })
        .where(eq(sessions.id, sessionId));
      console.log(`Session ${sessionId} status updated to analysis_failed.`);

      throw pipelineError;
    }

    // --- 6. Return Success Response ---
    // Since the client polls /status, this endpoint could technically return success
    // right after setting status to 'analysis_pending'.
    // However, the current implementation waits for the synchronous pipeline.
    // Returning the analysisId here might be redundant if polling is working,
    // but useful for direct feedback if polling isn't implemented or fails.
    return NextResponse.json(
      { success: true, analysisId: finalAnalysisId }, // analysisId might be null if pipeline failed before storing
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `Error in start analysis route for session ${sessionId}:`,
      error
    );
    // Ensure session status is marked as failed if not already handled
    // (This check might be redundant if the inner try/catch always updates on failure)
    if (session && session.status !== "analysis_failed") {
      try {
        await db
          .update(sessions)
          .set({ status: "analysis_failed", updatedAt: new Date() })
          .where(eq(sessions.id, sessionId));
      } catch (updateError) {
        console.error(
          `Failed to update session ${sessionId} to failed status during error handling:`,
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "ANALYSIS_START_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "An internal error occurred.",
      },
      { status: 500 }
    );
  }
}
