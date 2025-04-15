import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, analyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils"; // Use crypto for UUID generation

// --- Placeholder Imports & Types (Replace with actual implementations) ---
import { AnalysisResult, generateAnalysis } from "@/lib/ai"; // Assume this exists and works
// import { downloadImage, extractColors } from '@/lib/image-processing'; // Assume these exist
type ExtractedColors = {
  eyeColor: string;
  hairColor: string;
  skinColor: string;
}; // Placeholder
// -------------------------------------------------------------------------

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
        uploadedImagePath: sessions.uploadedImagePath,
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
        { status: 409 } // Conflict
      );
    }

    // Check for required data
    if (!session.uploadedImagePath) {
      console.error(
        `Start analysis: Missing uploadedImagePath for session ${sessionId}`
      );
      throw new Error("Session is missing the uploaded image path.");
    }
    if (!session.questionnaireData) {
      console.error(
        `Start analysis: Missing questionnaireData for session ${sessionId}`
      );
      throw new Error("Session is missing the questionnaire data.");
    }

    // --- 2. Update Status to Pending/Running ---
    // Using 'analysis_pending' initially
    await db
      .update(sessions)
      .set({ status: "analysis_pending", updatedAt: new Date() })
      .where(eq(sessions.id, sessionId));

    console.log(`Session ${sessionId} status updated to analysis_pending.`);

    // --- 3. Perform Analysis (Simulated) ---
    // In a real scenario, this section would be more robust and potentially asynchronous
    // or trigger a background job.

    let analysisResult: AnalysisResult | null = null;
    let finalAnalysisId: string | null = null;

    try {
      console.log(
        `Starting simulated analysis pipeline for session ${sessionId}...`
      );

      // --- 3a. Image Processing (Placeholder) ---
      console.log(
        `   - Simulating image download/processing for: ${session.uploadedImagePath}`
      );
      // const imageBuffer = await downloadImage(session.uploadedImagePath);
      // const extractedColors: ExtractedColors = await extractColors(imageBuffer);
      const extractedColors: ExtractedColors = {
        eyeColor: "#aabbcc",
        hairColor: "#112233",
        skinColor: "#eeddcc",
      }; // Dummy data
      console.log(`   - Simulated extracted colors:`, extractedColors);

      // --- 3b. LLM Analysis (Placeholder) ---
      console.log(`   - Simulating LLM analysis...`);
      analysisResult = await generateAnalysis({
        // TODO: Define AnalysisInput type properly
        extractedColors: extractedColors, // Pass simulated colors
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questionnaireAnswers: session.questionnaireData as any, // Cast for now
      });
      console.log(`   - Simulated LLM analysis complete.`);

      // --- 3c. Store Result in 'analyses' Table ---
      console.log(`   - Storing analysis result in database...`);
      const newAnalysisId = generateUUID();
      await db.insert(analyses).values({
        id: newAnalysisId,
        result: analysisResult, // Store the validated JSON result
        // createdAt/updatedAt have defaults
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
        })
        .where(eq(sessions.id, sessionId));

      console.log(`Session ${sessionId} status updated to analysis_complete.`);

      // --- 5. Cleanup (Optional - Placeholder) ---
      // console.log(`   - Simulating cleanup of blob: ${session.uploadedImagePath}`);
      // await del(session.uploadedImagePath); // Requires import { del } from '@vercel/blob';
      // Consider nullifying questionnaireData/uploadedImagePath in sessions table too?
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

      // Re-throw or handle the error appropriately for the final response
      throw pipelineError; // Let the outer catch block handle the response
    }

    // --- 6. Return Success Response ---
    // The client polls /status, so this endpoint just needs to confirm it started.
    // We return success immediately after updating status to pending.
    // The actual result is handled via polling.
    // However, since this is currently synchronous simulation, we wait for the whole thing.
    return NextResponse.json(
      { success: true, analysisId: finalAnalysisId },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `Error in start analysis route for session ${sessionId}:`,
      error
    );
    // Ensure session status is marked as failed if not already handled
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
