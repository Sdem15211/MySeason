import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { protos } from "@google-cloud/vision";
import sharp from "sharp";
import {
  StoredLandmarks,
  CalculatedRegions,
  ExtractedColors,
  StoredLandmark,
} from "@/lib/types/image-analysis.types";
import {
  calculateFaceRegions,
  extractFacialColors,
} from "@/lib/image-analysis";

// Define the type for Google Vision API landmarks if not already available
// This avoids potential issues if protos types are complex
type VisionLandmark = protos.google.cloud.vision.v1.FaceAnnotation.ILandmark;

// Initialize the Vision client
const visionClient = new ImageAnnotatorClient();

// Helper function to map Vision API landmarks to our internal StoredLandmark type
function mapVisionLandmarksToStored(
  landmarks: VisionLandmark[]
): StoredLandmark[] {
  return landmarks.map((lm) => ({
    type: lm.type as string, // Cast to string to satisfy StoredLandmark's 'string | null | undefined' part
    position: {
      x: lm.position?.x,
      y: lm.position?.y,
      z: lm.position?.z,
    },
  }));
}

async function getLandmarksFromImage(
  imageDataUrl: string
): Promise<StoredLandmarks> {
  const base64Data = imageDataUrl.split(",")[1];
  if (!base64Data) {
    throw new Error("Invalid data URL format");
  }
  const initialBuffer = Buffer.from(base64Data, "base64");

  let rotatedBuffer: Buffer;
  try {
    rotatedBuffer = await sharp(initialBuffer).rotate().toBuffer();
  } catch (rotationError) {
    console.warn(
      "[API /dev/analyze-image] Error during sharp rotation, using original buffer:",
      rotationError
    );
    rotatedBuffer = initialBuffer;
  }

  const rotatedBase64Data = rotatedBuffer.toString("base64");

  const visionRequest = {
    image: { content: rotatedBase64Data },
    features: [
      { type: protos.google.cloud.vision.v1.Feature.Type.FACE_DETECTION },
    ],
  };

  const [result] = await visionClient.faceDetection(visionRequest);
  const faces = result.faceAnnotations;
  if (!faces || faces.length === 0) {
    return []; // No faces detected
  }
  const visionLandmarks = faces[0]?.landmarks;
  if (!visionLandmarks) {
    return []; // No landmarks found on the first face
  }
  // Map the landmarks before returning
  return mapVisionLandmarksToStored(visionLandmarks);
}

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

    // 1. Get Landmarks
    const landmarks = await getLandmarksFromImage(imageDataUrl);
    if (!landmarks || landmarks.length === 0) {
      return NextResponse.json(
        { success: false, error: "No landmarks detected" },
        { status: 404 }
      );
    }

    // 2. Get Image Buffer and Dimensions for Color/Region Calculation
    const base64Data = imageDataUrl.split(",")[1];
    // Add check for base64Data before using it
    if (!base64Data) {
      throw new Error("Invalid data URL format when preparing buffer.");
    }
    const initialBuffer = Buffer.from(base64Data, "base64"); // Now safe
    const imageSharp = sharp(initialBuffer).rotate(); // Apply rotation
    const imageBuffer = await imageSharp.toBuffer();
    const metadata = await imageSharp.metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    if (!imageWidth || !imageHeight) {
      throw new Error("Could not determine image dimensions after rotation.");
    }

    // 3. Calculate Regions
    const regions: CalculatedRegions = calculateFaceRegions(
      landmarks,
      imageWidth,
      imageHeight
    );

    // 4. Extract Colors
    const colors: ExtractedColors = await extractFacialColors(
      imageBuffer,
      landmarks
    );

    // 5. Return Results
    return NextResponse.json(
      {
        success: true,
        landmarks: landmarks, // Optional: return landmarks too for reference
        regions: regions,
        colors: colors,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /dev/analyze-image] Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
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
