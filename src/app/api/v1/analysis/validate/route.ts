import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { validateSelfieImage } from "@/lib/vision";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  console.log("Received POST request to /api/v1/analysis/validate");
  let blobUrlToDelete: string | null = null;

  try {
    const { blobUrl, sessionId } = await request.json();

    if (!blobUrl || typeof blobUrl !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_BLOB_URL",
          message: "Blob URL is required.",
        },
        { status: 400 }
      );
    }
    blobUrlToDelete = blobUrl;

    if (!sessionId || typeof sessionId !== "string") {
      if (blobUrlToDelete) await del(blobUrlToDelete);
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_SESSION_ID",
          message: "Session ID is required.",
        },
        { status: 400 }
      );
    }

    console.log(
      `Calling validation utility for session: ${sessionId}, Blob URL: ${blobUrl}`
    );

    const validationResult = await validateSelfieImage(blobUrl);

    if (!validationResult.success) {
      console.log(
        `Validation failed for ${blobUrl}: ${validationResult.error} - ${validationResult.message}`
      );
      await del(blobUrl);
      blobUrlToDelete = null;

      const status =
        validationResult.error === "VISION_API_ERROR" ||
        validationResult.error === "VALIDATION_LOGIC_ERROR"
          ? 500
          : 400;

      return NextResponse.json(
        {
          success: false,
          error: validationResult.error,
          message: validationResult.message,
        },
        { status }
      );
    }

    console.log(
      `Validation successful for session: ${sessionId}. Updating database.`
    );

    try {
      const currentSession = await db
        .select({
          id: sessions.id,
          status: sessions.status,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (!currentSession || currentSession.length === 0) {
        console.error(`Session not found for ID: ${sessionId}`);
        await del(blobUrl);
        return NextResponse.json(
          {
            success: false,
            error: "SESSION_NOT_FOUND",
            message: "Session ID not found.",
          },
          { status: 404 }
        );
      }

      const session = currentSession[0];

      if (!session) {
        console.error(`Session not found for ID: ${sessionId}`);
        await del(blobUrl);
        return NextResponse.json(
          {
            success: false,
            error: "SESSION_NOT_FOUND",
            message: "Session ID not found.",
          },
          { status: 404 }
        );
      }
      if (session.status !== "payment_complete") {
        console.warn(
          `Session ${sessionId} is in unexpected state: ${session.status}. Expected 'payment_complete'.`
        );
        await del(blobUrl);
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_SESSION_STATE",
            message: `Session is in an unexpected state (${session.status}).`,
          },
          { status: 409 }
        );
      }

      await db
        .update(sessions)
        .set({
          status: "awaiting_questionnaire",
          imageBlobUrl: blobUrl,
          faceLandmarks: validationResult.landmarks,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId));

      console.log(
        `Session ${sessionId} updated successfully to awaiting_questionnaire.`
      );

      blobUrlToDelete = null;

      return NextResponse.json(
        {
          success: true,
          message: "Image validated and session updated.",
          // Optionally return landmarks if needed by frontend, but not strictly necessary
          // landmarks: validationResult.landmarks
        },
        { status: 200 }
      );
    } catch (dbError) {
      console.error(
        `Database error updating session ${sessionId} after validation:`,
        dbError
      );
      if (blobUrl) await del(blobUrl);
      return NextResponse.json(
        {
          success: false,
          error: "DATABASE_UPDATE_ERROR",
          message: "Failed to update session after validation.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error in validation route";
    console.error(
      `Error in validation route handler for blob ${blobUrlToDelete ?? "N/A"}:`,
      error
    );

    if (blobUrlToDelete) {
      try {
        console.log(
          `Attempting to delete blob ${blobUrlToDelete} due to route handler error`
        );
        await del(blobUrlToDelete);
      } catch (deleteError) {
        console.error(
          `Failed to delete blob ${blobUrlToDelete} during error handling:`,
          deleteError
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "VALIDATION_ROUTE_ERROR", message },
      { status: 500 }
    );
  }
}
