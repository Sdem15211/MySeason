import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { validateSelfieImage } from "@/lib/vision";

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
      `Validation successful for session: ${sessionId}, Blob URL: ${blobUrl}`
    );
    blobUrlToDelete = null;

    return NextResponse.json(
      {
        success: true,
        message: "Image validated successfully.",
        landmarks: validationResult.landmarks,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error in validation route";
    console.error(
      `Error in validation route handler for ${blobUrlToDelete}:`,
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
