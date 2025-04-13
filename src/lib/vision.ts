import { ImageAnnotatorClient } from "@google-cloud/vision";
import { google } from "@google-cloud/vision/build/protos/protos";

// Instantiate the client
// The client will automatically use the credentials provided
// via the GOOGLE_APPLICATION_CREDENTIALS environment variable.
const visionClient = new ImageAnnotatorClient();

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

// Optional: Add more specific helper functions as needed, e.g., for landmark detection
// export async function detectLandmarks(imageBuffer: Buffer): Promise<...> { ... }
