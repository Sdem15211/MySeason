import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, analyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { AnalysisOutput } from "@/lib/schemas/analysis-output.schema";
import { generateAnalysis } from "@/lib/ai";
import { extractFacialColors } from "@/lib/image-analysis";
import {
  StoredLandmarks,
  ExtractedColors,
} from "@/lib/types/image-analysis.types";
import { contrastRatioHex } from "@/lib/color-contrast";
import { QuestionnaireFormData } from "@/lib/schemas/questionnaire";
import { LLMInput } from "@/lib/schemas/llm-input.schema";
import { del } from "@vercel/blob";

export interface StoredInputData {
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
    let analysisResult: AnalysisOutput | null = null;
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
      const extractedColorData: ExtractedColors = await extractFacialColors(
        imageBuffer,
        landmarks
      );
      console.log(
        `   - Extracted facial data for session ${sessionId}:`,
        extractedColorData
      );

      // --- 3c. LLM Analysis Preparation: compute contrast levels ---
      const validatedQuestionnaireData =
        session.questionnaireData as QuestionnaireFormData;

      // Extract hex colors
      const skinHex = extractedColorData.skinColorHex;
      const eyeHex = extractedColorData.averageEyeColorHex;
      const hairHex = validatedQuestionnaireData.naturalHairColor;

      if (!skinHex || !eyeHex || !hairHex) {
        throw new Error(
          "Missing required color data (skin, eye, or hair hex) for contrast calculations."
        );
      }

      // Compute contrast ratios and categories
      const skinEyeRatio = contrastRatioHex(skinHex, eyeHex);
      const skinHairRatio = contrastRatioHex(skinHex, hairHex);
      const eyeHairRatio = contrastRatioHex(eyeHex, hairHex);

      let overallCategory: "High" | "Medium" | "Low";
      const ratios = [skinEyeRatio, skinHairRatio, eyeHairRatio];
      if (ratios.some((r) => r >= 7)) {
        overallCategory = "High";
      } else if (ratios.some((r) => r >= 4.5)) {
        overallCategory = "Medium";
      } else {
        overallCategory = "Low";
      }

      // Prepare the 'extractedColors' part for the LLM Input, including contrast
      const llmExtractedColors = {
        // Spread the base data, excluding the LAB objects we need to remap
        skinColorHex: extractedColorData.skinColorHex,
        averageEyeColorHex: extractedColorData.averageEyeColorHex,
        averageEyebrowColorHex: extractedColorData.averageEyebrowColorHex,
        averageLipColorHex: extractedColorData.averageLipColorHex,
        // Remap LAB values to use uppercase keys L, A, B
        skinColorLAB: extractedColorData.skinColorLab
          ? {
              L: extractedColorData.skinColorLab.l,
              A: extractedColorData.skinColorLab.a,
              B: extractedColorData.skinColorLab.b,
            }
          : null,
        // Add contrast data
        contrast: {
          skinEyeRatio,
          skinHairRatio,
          eyeHairRatio,
          overall: overallCategory,
        },
        // Pass calculatedUndertone from ExtractedColors
        calculatedUndertone: extractedColorData.skinUndertone || null,
      };

      // Prepare the complete LLM input object
      const llmInput: LLMInput = {
        extractedColors: llmExtractedColors,
        questionnaireAnswers: validatedQuestionnaireData,
      };

      // --- 3d. LLM Analysis ---
      console.log(`   - Calling LLM analysis with prepared input...`);
      analysisResult = await generateAnalysis(llmInput);
      console.log(`   - LLM analysis complete.`);

      // --- 3e. Store Result in 'analyses' Table ---
      console.log(`   - Storing analysis result and input data in database...`);
      const newAnalysisId = generateUUID();

      // Prepare the data TO BE STORED (using updated StoredInputData structure)
      const inputDataForStorage: StoredInputData = {
        extractedFeatures: {
          ...extractedColorData,
          contrast: llmExtractedColors.contrast,
          calculatedUndertone: extractedColorData.skinUndertone || undefined,
        },
        questionnaireData: validatedQuestionnaireData,
      };

      await db.insert(analyses).values({
        id: newAnalysisId,
        result: analysisResult,
        inputData: inputDataForStorage,
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

      // --- 5. Cleanup Blob ---
      if (session.imageBlobUrl) {
        try {
          console.log(`   - Deleting blob: ${session.imageBlobUrl}`);
          await del(session.imageBlobUrl as string); // Delete the blob from Vercel Blob storage
          console.log(
            `   - Successfully deleted blob: ${session.imageBlobUrl}`
          );
          await db
            .update(sessions)
            .set({ imageBlobUrl: null })
            .where(eq(sessions.id, sessionId));
        } catch (blobError) {
          // Log the error but don't fail the entire request, as the main analysis succeeded.
          console.error(
            `   - Failed to delete blob ${session.imageBlobUrl}:`,
            blobError
          );
          // Optionally, you could implement a retry mechanism or add this URL to a cleanup queue.
        }
      } else {
        console.warn(
          `   - No imageBlobUrl found for session ${sessionId} to delete.`
        );
      }
    } catch (pipelineError) {
      console.error(
        `Analysis pipeline failed for session ${sessionId}:`,
        pipelineError
      );
      // Directly attempt to update the status to failed, assuming it should be pending
      try {
        await db
          .update(sessions)
          .set({ status: "analysis_failed", updatedAt: new Date() })
          .where(eq(sessions.id, sessionId));
        console.log(
          `Session ${sessionId} status updated to analysis_failed due to pipeline error.`
        );
      } catch (updateError) {
        console.error(
          `Failed to update session ${sessionId} status to failed during pipeline error handling:`,
          updateError
        );
      }
      // Re-throw the error to be caught by the outer handler
      throw pipelineError;
    }

    // --- 6. Return Success Response ---
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
    if (
      session &&
      session.status !== "analysis_pending" &&
      session.status !== "analysis_failed"
    ) {
      try {
        await db
          .update(sessions)
          .set({ status: "analysis_failed", updatedAt: new Date() })
          .where(eq(sessions.id, sessionId));
        console.log(
          `Session ${sessionId} status updated to analysis_failed due to outer catch block.`
        );
      } catch (updateError) {
        console.error(
          `Failed to update session ${sessionId} to failed status during outer error handling:`,
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
