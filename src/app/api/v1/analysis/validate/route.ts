import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient, protos } from "@google-cloud/vision";
import { del } from "@vercel/blob";

// Initialize Vision client (outside handler for reuse)
const visionClient = new ImageAnnotatorClient();

// Define likelihood thresholds (adjust as needed)
// See: https://cloud.google.com/vision/docs/reference/rest/v1/Likelihood
const LIKELIHOOD_THRESHOLD: protos.google.cloud.vision.v1.Likelihood[] = [4, 5];
const DETECTION_CONFIDENCE_THRESHOLD = 0.75; // Minimum confidence for face detection

export async function POST(request: NextRequest) {
  console.log("Received POST request to /api/v1/analysis/validate");
  let blobUrlToDelete: string | null = null; // Keep track of URL for potential deletion

  try {
    const { blobUrl, sessionId } = await request.json();
    blobUrlToDelete = blobUrl; // Store for potential cleanup

    if (!blobUrl || typeof blobUrl !== "string") {
      blobUrlToDelete = null; // Don't delete if URL was invalid
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_BLOB_URL",
          message: "Blob URL is required.",
        },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== "string") {
      // Although sessionId might not be directly used for validation itself,
      // it's crucial for linking the analysis and potential cleanup.
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
      `Validating image for session: ${sessionId}, Blob URL: ${blobUrl}`
    );

    // --- Implement Google Cloud Vision API call ---
    const [result] = await visionClient.annotateImage({
      image: { source: { imageUri: blobUrl } },
      features: [{ type: "FACE_DETECTION" }], // Ensure we request face detection features
    });

    const faces = result.faceAnnotations;

    if (!faces || faces.length === 0) {
      console.log(`Validation failed: No face detected for ${blobUrl}`);
      await del(blobUrl);
      blobUrlToDelete = null; // Mark as deleted
      return NextResponse.json(
        {
          success: false,
          error: "NO_FACE_DETECTED",
          message: "No face was detected in the image.",
        },
        { status: 400 }
      );
    }

    if (faces.length > 1) {
      console.log(`Validation failed: Multiple faces detected for ${blobUrl}`);
      await del(blobUrl);
      blobUrlToDelete = null;
      return NextResponse.json(
        {
          success: false,
          error: "MULTIPLE_FACES_DETECTED",
          message:
            "More than one face was detected. Please upload a photo with only your face.",
        },
        { status: 400 }
      );
    }

    const face = faces[0]; // We've established there's exactly one face

    if (!face) {
      console.error(
        `Validation logic error: Face annotation unexpectedly undefined for ${blobUrlToDelete}`
      );
      if (blobUrlToDelete) {
        await del(blobUrlToDelete);
      }
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_LOGIC_ERROR",
          message: "Internal error during face validation.",
        },
        { status: 500 }
      );
    }

    // 1. Check Detection Confidence
    if (
      face.detectionConfidence != null &&
      face.detectionConfidence < DETECTION_CONFIDENCE_THRESHOLD
    ) {
      console.log(
        `Validation failed: Low detection confidence (${face.detectionConfidence}) for ${blobUrl}`
      );
      await del(blobUrl);
      blobUrlToDelete = null;
      return NextResponse.json(
        {
          success: false,
          error: "LOW_DETECTION_CONFIDENCE",
          message: "Could not confidently detect a face. Try a clearer photo.",
        },
        { status: 400 }
      );
    }

    // 2. Check for Blurriness
    if (
      face.blurredLikelihood != null &&
      face.blurredLikelihood !== "UNKNOWN" &&
      LIKELIHOOD_THRESHOLD.includes(face.blurredLikelihood as number)
    ) {
      console.log(
        `Validation failed: Image likely blurry (${face.blurredLikelihood}) for ${blobUrl}`
      );
      await del(blobUrl);
      blobUrlToDelete = null;
      return NextResponse.json(
        {
          success: false,
          error: "IMAGE_TOO_BLURRY",
          message: "The image appears to be too blurry.",
        },
        { status: 400 }
      );
    }

    // 3. Check for Under Exposure
    if (
      face.underExposedLikelihood != null &&
      face.underExposedLikelihood !== "UNKNOWN" &&
      LIKELIHOOD_THRESHOLD.includes(face.underExposedLikelihood as number)
    ) {
      console.log(
        `Validation failed: Image likely underexposed (${face.underExposedLikelihood}) for ${blobUrl}`
      );
      await del(blobUrl);
      blobUrlToDelete = null;
      return NextResponse.json(
        {
          success: false,
          error: "IMAGE_UNDEREXPOSED",
          message: "The image appears to be too dark.",
        },
        { status: 400 }
      );
    }

    // TODO: Extract specific landmarks if needed for later steps.
    // For now, we just confirm validation passed.
    const landmarks = face.landmarks; // face is guaranteed to be defined here

    console.log(
      `Validation successful for session: ${sessionId}, Blob URL: ${blobUrl}`
    );
    blobUrlToDelete = null; // Validation succeeded, don't delete the blob

    return NextResponse.json(
      { success: true, message: "Image validated successfully.", landmarks }, // Return landmarks or other relevant data
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error during validation";
    console.error(
      `Error during image validation for ${blobUrlToDelete}:`,
      error
    );

    // Attempt to delete the blob if an error occurred *after* getting the URL
    // and the blob wasn't already deleted due to a validation failure.
    if (blobUrlToDelete) {
      try {
        console.log(
          `Attempting to delete blob due to error: ${blobUrlToDelete}`
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
      { success: false, error: "VALIDATION_API_ERROR", message },
      { status: 500 }
    );
  }
}
