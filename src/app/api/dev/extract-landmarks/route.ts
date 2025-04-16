import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { protos } from "@google-cloud/vision";
import sharp from "sharp";

// Initialize the Vision client
// Ensure your Google Cloud credentials are set up in the environment
// (e.g., GOOGLE_APPLICATION_CREDENTIALS)
const visionClient = new ImageAnnotatorClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageDataUrl = body.image;

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid image data URL" },
        { status: 400 }
      );
    }

    // Extract base64 data from data URL
    const base64Data = imageDataUrl.split(",")[1];
    if (!base64Data) {
      return NextResponse.json(
        { success: false, error: "Invalid data URL format" },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const initialBuffer = Buffer.from(base64Data, "base64");

    // --- Auto-rotate based on EXIF ---
    // console.log("[API /dev/extract-landmarks] Rotating image based on EXIF...");
    let rotatedBuffer: Buffer;
    try {
      rotatedBuffer = await sharp(initialBuffer).rotate().toBuffer();
      // console.log("[API /dev/extract-landmarks] Image rotated.");
    } catch (rotationError) {
      console.warn(
        "[API /dev/extract-landmarks] Error during sharp rotation, using original buffer:",
        rotationError
      );
      // If rotation fails (e.g., format not supported by sharp for rotation), proceed with original buffer
      rotatedBuffer = initialBuffer;
    }

    // Convert the *rotated* buffer back to base64 for Vision API
    const rotatedBase64Data = rotatedBuffer.toString("base64");

    // Prepare the request for the Vision API using rotated data
    const visionRequest = {
      image: {
        content: rotatedBase64Data, // Use rotated data
      },
      features: [
        { type: protos.google.cloud.vision.v1.Feature.Type.FACE_DETECTION },
      ],
    };

    // console.log("[API /dev/extract-landmarks] Sending request to Vision API...");
    // Detect faces in the image
    const [result] = await visionClient.faceDetection(visionRequest);
    // console.log("[API /dev/extract-landmarks] Received response from Vision API.");

    const faces = result.faceAnnotations;
    if (!faces || faces.length === 0) {
      // console.log("[API /dev/extract-landmarks] No faces detected.");
      return NextResponse.json(
        { success: true, landmarks: [] },
        { status: 200 }
      ); // Return empty array if no faces
    }

    // We only care about the first detected face for this purpose
    const firstFace = faces[0];
    const landmarks = firstFace?.landmarks;

    if (!landmarks) {
      // console.log("[API /dev/extract-landmarks] No landmarks detected on the first face.");
      return NextResponse.json(
        { success: true, landmarks: [] },
        { status: 200 }
      ); // Return empty array if no landmarks
    }

    // console.log(`[API /dev/extract-landmarks] Found ${landmarks.length} landmarks.`);

    return NextResponse.json(
      { success: true, landmarks: landmarks },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /dev/extract-landmarks] Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    // Provide more details if it's a sharp error
    const detailedMessage =
      error instanceof Error &&
      error.message.includes("Input buffer contains unsupported image format")
        ? `Unsupported image format or corrupt image file. ${message}`
        : message;
    return NextResponse.json(
      { success: false, error: detailedMessage },
      { status: 500 }
    );
  }
}
