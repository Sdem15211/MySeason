import { ImageAnnotatorClient, protos } from "@google-cloud/vision";
import { google } from "@google-cloud/vision/build/protos/protos";

// Instantiate the client
// The client will automatically use the credentials provided
// via the GOOGLE_APPLICATION_CREDENTIALS environment variable.
const visionClient = new ImageAnnotatorClient();

// Define likelihood thresholds (adjust as needed)
// See: https://cloud.google.com/vision/docs/reference/rest/v1/Likelihood
const LIKELIHOOD_THRESHOLD: protos.google.cloud.vision.v1.Likelihood[] = [
  protos.google.cloud.vision.v1.Likelihood.VERY_LIKELY,
  protos.google.cloud.vision.v1.Likelihood.LIKELY,
];
// Minimum confidence for face detection
const DETECTION_CONFIDENCE_THRESHOLD = 0.75;

/**
 * Possible error codes during selfie validation.
 */
export type ValidationErrorCode =
  | "NO_FACE_DETECTED"
  | "MULTIPLE_FACES_DETECTED"
  | "LOW_DETECTION_CONFIDENCE"
  | "IMAGE_TOO_BLURRY"
  | "IMAGE_UNDEREXPOSED"
  | "VALIDATION_LOGIC_ERROR"
  | "VISION_API_ERROR";

/**
 * Represents the result of a selfie validation attempt.
 */
export interface ValidationResult {
  success: boolean;
  error?: ValidationErrorCode;
  message?: string;
  landmarks?: protos.google.cloud.vision.v1.FaceAnnotation.ILandmark[] | null;
}

/**
 * Detects faces in an image buffer using the Google Cloud Vision API.
 *
 * @param imageBuffer The buffer containing the image data.
 * @returns A promise that resolves with the face annotations detected in the image.
 * @throws Throws an error if the API call fails.
 */
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
    ); // Optional: Log detected faces for debugging

    if (!faces) {
      return [];
    }

    return faces;
  } catch (error) {
    console.error("Google Cloud Vision API Error:", error);
    // Consider more specific error handling based on potential API errors
    throw new Error("Failed to detect faces using Google Cloud Vision API.");
  }
}

/**
 * Validates a selfie image from a URL using Google Cloud Vision API.
 * Checks for single face presence, confidence, blurriness, and exposure.
 *
 * @param imageUrl The public URL of the image to validate.
 * @returns A promise that resolves with the ValidationResult.
 */
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
      landmarks: face.landmarks, // Return landmarks if needed later
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

// Optional: Add more specific helper functions as needed, e.g., for landmark detection
// export async function detectLandmarks(imageBuffer: Buffer): Promise<...> { ... }
