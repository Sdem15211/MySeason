import { ImageAnnotatorClient, protos } from "@google-cloud/vision";
import { google } from "@google-cloud/vision/build/protos/protos";

const getCredentials = () => {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error(
      "GOOGLE_CREDENTIALS_JSON environment variable is not set. " +
        "Please provide the service account JSON key content in this variable (local: via .env.local, Vercel: via dashboard)."
    );
  }
  try {
    return JSON.parse(credentialsJson);
  } catch (error) {
    console.error("Failed to parse GOOGLE_CREDENTIALS_JSON:", error);
    throw new Error(
      "Failed to parse GOOGLE_CREDENTIALS_JSON. Ensure it's valid JSON."
    );
  }
};

const visionClient = new ImageAnnotatorClient({
  credentials: getCredentials(),
});

const LIKELIHOOD_THRESHOLD: protos.google.cloud.vision.v1.Likelihood[] = [
  protos.google.cloud.vision.v1.Likelihood.VERY_LIKELY,
  protos.google.cloud.vision.v1.Likelihood.LIKELY,
];
const DETECTION_CONFIDENCE_THRESHOLD = 0.75;

export type ValidationErrorCode =
  | "NO_FACE_DETECTED"
  | "MULTIPLE_FACES_DETECTED"
  | "LOW_DETECTION_CONFIDENCE"
  | "IMAGE_TOO_BLURRY"
  | "IMAGE_UNDEREXPOSED"
  | "VALIDATION_LOGIC_ERROR"
  | "VISION_API_ERROR";

export interface ValidationResult {
  success: boolean;
  error?: ValidationErrorCode;
  message?: string;
  landmarks?: protos.google.cloud.vision.v1.FaceAnnotation.ILandmark[] | null;
}

export async function detectFaces(
  imageBuffer: Buffer
): Promise<google.cloud.vision.v1.IFaceAnnotation[]> {
  try {
    const [result] = await visionClient.faceDetection({
      image: {
        content: imageBuffer,
      },
    });

    const faces = result.faceAnnotations;
    console.log(
      `Detected ${faces?.length ?? 0} faces.`,
      JSON.stringify(faces, null, 2)
    );

    if (!faces) {
      return [];
    }

    return faces;
  } catch (error) {
    console.error("Google Cloud Vision API Error:", error);
    throw new Error("Failed to detect faces using Google Cloud Vision API.");
  }
}

export async function validateSelfieImage(
  imageUrl: string
): Promise<ValidationResult> {
  console.log(`Initiating validation for image URL: ${imageUrl}`);
  try {
    const [result] = await visionClient.annotateImage({
      image: { source: { imageUri: imageUrl } },
      features: [{ type: "FACE_DETECTION" }],
    });

    const faces = result.faceAnnotations;

    // 1. Check for no faces
    if (!faces || faces.length === 0) {
      console.log(`Validation failed: No face detected for ${imageUrl}`);
      return {
        success: false,
        error: "NO_FACE_DETECTED",
        message: "No face was detected in the image.",
      };
    }

    // 2. Check for multiple faces
    if (faces.length > 1) {
      console.log(`Validation failed: Multiple faces detected for ${imageUrl}`);
      return {
        success: false,
        error: "MULTIPLE_FACES_DETECTED",
        message:
          "More than one face was detected. Please upload a photo with only your face.",
      };
    }

    const face = faces[0];

    // This should theoretically not happen if length is 1, but check for safety
    if (!face) {
      console.error(
        `Validation logic error: Face annotation unexpectedly undefined for ${imageUrl}`
      );
      return {
        success: false,
        error: "VALIDATION_LOGIC_ERROR",
        message: "Internal error during face validation.",
      };
    }

    // 3. Check Detection Confidence
    if (
      face.detectionConfidence != null &&
      face.detectionConfidence < DETECTION_CONFIDENCE_THRESHOLD
    ) {
      console.log(
        `Validation failed: Low detection confidence (${face.detectionConfidence}) for ${imageUrl}`
      );
      return {
        success: false,
        error: "LOW_DETECTION_CONFIDENCE",
        message: "Could not confidently detect a face. Try a clearer photo.",
      };
    }

    // 4. Check for Blurriness
    if (
      face.blurredLikelihood &&
      face.blurredLikelihood !== "UNKNOWN" &&
      LIKELIHOOD_THRESHOLD.includes(
        face.blurredLikelihood as protos.google.cloud.vision.v1.Likelihood
      )
    ) {
      console.log(
        `Validation failed: Image likely blurry (${face.blurredLikelihood}) for ${imageUrl}`
      );
      return {
        success: false,
        error: "IMAGE_TOO_BLURRY",
        message: "The image appears to be too blurry.",
      };
    }

    // 5. Check for Under Exposure
    if (
      face.underExposedLikelihood &&
      face.underExposedLikelihood !== "UNKNOWN" &&
      LIKELIHOOD_THRESHOLD.includes(
        face.underExposedLikelihood as protos.google.cloud.vision.v1.Likelihood
      )
    ) {
      console.log(
        `Validation failed: Image likely underexposed (${face.underExposedLikelihood}) for ${imageUrl}`
      );
      return {
        success: false,
        error: "IMAGE_UNDEREXPOSED",
        message: "The image appears to be too dark.",
      };
    }

    // Validation successful
    console.log(`Validation successful for image URL: ${imageUrl}`);
    return {
      success: true,
      landmarks: face.landmarks,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Vision API error";
    console.error(`Google Cloud Vision API Error for ${imageUrl}:`, error);
    return {
      success: false,
      error: "VISION_API_ERROR",
      message: `Failed to validate image due to an API error: ${message}`,
    };
  }
}
