import type sharp from "sharp";

// --- Types ---

// Simple landmark position interface
interface IPosition {
  x: number | null | undefined;
  y: number | null | undefined;
  z: number | null | undefined;
}

// Landmark type enum
export enum LandmarkType {
  LEFT_CHEEK_CENTER = 1,
  RIGHT_CHEEK_CENTER = 2,
  FOREHEAD_GLABELLA = 7,
  LEFT_EYE_LEFT_CORNER = 17,
  LEFT_EYE_RIGHT_CORNER = 18,
  LEFT_EYE_TOP_BOUNDARY = 19,
  LEFT_EYE_BOTTOM_BOUNDARY = 20,
  RIGHT_EYE_LEFT_CORNER = 21,
  RIGHT_EYE_RIGHT_CORNER = 22,
  RIGHT_EYE_TOP_BOUNDARY = 23,
  RIGHT_EYE_BOTTOM_BOUNDARY = 24,
}

type LandmarkTypeValue = (typeof LandmarkType)[keyof typeof LandmarkType];

// Landmark structure received from API (simplified)
export interface StoredLandmark {
  type?: LandmarkTypeValue | string | null;
  position?: IPosition | null;
}
export type StoredLandmarks = StoredLandmark[] | null | undefined;

// Calculated regions needed for color extraction
export type CalculatedRegions = {
  leftCheekRegion: sharp.Region | null;
  rightCheekRegion: sharp.Region | null;
  foreheadRegion: sharp.Region | null;
  leftEyeRegion: sharp.Region | null;
  rightEyeRegion: sharp.Region | null;
};

// Final extracted colors
export type ExtractedColors = {
  skinColorHex: string | null;
  averageEyeColorHex: string | null;
};

// RGB color type
type RgbColor = { r: number; g: number; b: number };

// --- Helper Functions ---

// Finds a specific landmark from the list
const findLandmark = (
  landmarks: StoredLandmarks,
  typeValue: LandmarkTypeValue
): StoredLandmark | undefined => {
  if (!landmarks) return undefined;

  // Helper to get string name for comparison if type is stored as string
  const getLandmarkStringName = (
    value: LandmarkTypeValue
  ): string | undefined => {
    for (const key in LandmarkType) {
      if (LandmarkType[key as keyof typeof LandmarkType] === value) {
        return key;
      }
    }
    return undefined;
  };
  const typeString = getLandmarkStringName(typeValue);

  return landmarks.find((lm) => {
    if (typeof lm.type === "number") {
      return lm.type === typeValue;
    }
    if (typeof lm.type === "string") {
      return lm.type.toUpperCase() === typeString?.toUpperCase();
    }
    return false;
  });
};

// Calculates a rectangular region centered at a point, with boundary checks
const calculateRegion = (
  centerX: number | undefined | null,
  centerY: number | undefined | null,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number
): sharp.Region | null => {
  if (centerX == null || centerY == null || width <= 0 || height <= 0) {
    return null;
  }

  const regionWidth = Math.max(1, Math.round(width));
  const regionHeight = Math.max(1, Math.round(height));

  const left = Math.round(centerX - regionWidth / 2);
  const top = Math.round(centerY - regionHeight / 2);

  if (
    left < 0 ||
    top < 0 ||
    left + regionWidth > imageWidth ||
    top + regionHeight > imageHeight
  ) {
    return null;
  }

  return { left, top, width: regionWidth, height: regionHeight };
};

// Converts RGB color object to HEX string
const rgbToHex = (rgb: RgbColor | null): string | null => {
  if (!rgb) return null;
  const { r, g, b } = rgb;
  const intR = Math.max(0, Math.min(255, Math.round(r)));
  const intG = Math.max(0, Math.min(255, Math.round(g)));
  const intB = Math.max(0, Math.min(255, Math.round(b)));
  return `#${((1 << 24) + (intR << 16) + (intG << 8) + intB)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
};

// Extracts the average RGB color from a specified region of an image buffer
const getAverageRgbColor = async (
  imageBuffer: Buffer,
  region: sharp.Region | null
): Promise<RgbColor | null> => {
  if (!region) return null;

  try {
    // Ensure integer coords & dimensions >= 1 for sharp
    const intRegion: sharp.Region = {
      left: Math.round(region.left),
      top: Math.round(region.top),
      width: Math.max(1, Math.round(region.width)),
      height: Math.max(1, Math.round(region.height)),
    };

    // Dynamic import of sharp
    const { default: sharp } = await import("sharp");

    // Create a new sharp instance for this specific region
    // Extract the region first, then get stats on the extracted data
    const extractedBuffer = await sharp(imageBuffer)
      .extract(intRegion)
      .toBuffer();

    // Create a new sharp instance with just the extracted region
    const stats = await sharp(extractedBuffer).toColorspace("srgb").stats();

    const channels = stats.channels;

    // Log the actual channel data to help debug
    console.log(`Region ${JSON.stringify(intRegion)} channels:`, channels);

    if (channels && channels.length >= 3) {
      // Handle both RGB and RGBA images correctly
      return {
        r: channels[0]?.mean ?? 0,
        g: channels[1]?.mean ?? 0,
        b: channels[2]?.mean ?? 0,
      };
    }
    return null;
  } catch (error) {
    console.error(
      `Error extracting color for region ${JSON.stringify(region)}:`,
      error
    );
    return null;
  }
};

// --- Region Calculation Logic ---

// Renamed from calculateAllRegions for clarity when exporting
export function calculateFaceRegions(
  landmarks: StoredLandmarks,
  imageWidth: number,
  imageHeight: number
): CalculatedRegions {
  if (
    !landmarks ||
    !imageWidth ||
    !imageHeight ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return {
      leftCheekRegion: null,
      rightCheekRegion: null,
      foreheadRegion: null,
      leftEyeRegion: null,
      rightEyeRegion: null,
    };
  }

  const baseRegionSize = Math.max(
    10,
    Math.round(Math.min(imageWidth, imageHeight) * 0.05)
  );

  // Find necessary landmarks
  const leftCheek = findLandmark(landmarks, LandmarkType.LEFT_CHEEK_CENTER);
  const rightCheek = findLandmark(landmarks, LandmarkType.RIGHT_CHEEK_CENTER);
  const foreheadGlabella = findLandmark(
    landmarks,
    LandmarkType.FOREHEAD_GLABELLA
  );
  const leftEyeLeftCorner = findLandmark(
    landmarks,
    LandmarkType.LEFT_EYE_LEFT_CORNER
  );
  const leftEyeRightCorner = findLandmark(
    landmarks,
    LandmarkType.LEFT_EYE_RIGHT_CORNER
  );
  const leftEyeTopBoundary = findLandmark(
    landmarks,
    LandmarkType.LEFT_EYE_TOP_BOUNDARY
  );
  const leftEyeBottomBoundary = findLandmark(
    landmarks,
    LandmarkType.LEFT_EYE_BOTTOM_BOUNDARY
  );
  const rightEyeLeftCorner = findLandmark(
    landmarks,
    LandmarkType.RIGHT_EYE_LEFT_CORNER
  );
  const rightEyeRightCorner = findLandmark(
    landmarks,
    LandmarkType.RIGHT_EYE_RIGHT_CORNER
  );
  const rightEyeTopBoundary = findLandmark(
    landmarks,
    LandmarkType.RIGHT_EYE_TOP_BOUNDARY
  );
  const rightEyeBottomBoundary = findLandmark(
    landmarks,
    LandmarkType.RIGHT_EYE_BOTTOM_BOUNDARY
  );

  // Calculate skin regions
  const leftCheekRegion = calculateRegion(
    leftCheek?.position?.x,
    leftCheek?.position?.y,
    baseRegionSize,
    baseRegionSize,
    imageWidth,
    imageHeight
  );
  const rightCheekRegion = calculateRegion(
    rightCheek?.position?.x,
    rightCheek?.position?.y,
    baseRegionSize,
    baseRegionSize,
    imageWidth,
    imageHeight
  );

  let foreheadRegion: sharp.Region | null = null;
  if (
    foreheadGlabella?.position?.x != null &&
    foreheadGlabella?.position?.y != null
  ) {
    const centerX = foreheadGlabella.position.x;
    const centerY = foreheadGlabella.position.y;
    const verticalShift = baseRegionSize * 2;
    const shiftedCenterY = centerY - verticalShift;
    foreheadRegion = calculateRegion(
      centerX,
      shiftedCenterY,
      baseRegionSize,
      baseRegionSize,
      imageWidth,
      imageHeight
    );
  }

  // Calculate eye regions
  const eyeRegionSize = Math.max(4, Math.round(baseRegionSize * 0.3));
  const eyeHorizontalShift = Math.round(eyeRegionSize * 0.5);

  let leftEyeRegion: sharp.Region | null = null;
  if (
    leftEyeLeftCorner?.position?.x != null &&
    leftEyeRightCorner?.position?.x != null &&
    leftEyeTopBoundary?.position?.y != null &&
    leftEyeBottomBoundary?.position?.y != null
  ) {
    const centerX =
      (leftEyeLeftCorner.position.x + leftEyeRightCorner.position.x) / 2;
    const centerY =
      (leftEyeTopBoundary.position.y + leftEyeBottomBoundary.position.y) / 2;
    const shiftedCenterX = centerX - eyeHorizontalShift;
    leftEyeRegion = calculateRegion(
      shiftedCenterX,
      centerY,
      eyeRegionSize,
      eyeRegionSize,
      imageWidth,
      imageHeight
    );
  }

  let rightEyeRegion: sharp.Region | null = null;
  if (
    rightEyeLeftCorner?.position?.x != null &&
    rightEyeRightCorner?.position?.x != null &&
    rightEyeTopBoundary?.position?.y != null &&
    rightEyeBottomBoundary?.position?.y != null
  ) {
    const centerX =
      (rightEyeLeftCorner.position.x + rightEyeRightCorner.position.x) / 2;
    const centerY =
      (rightEyeTopBoundary.position.y + rightEyeBottomBoundary.position.y) / 2;
    const shiftedCenterX = centerX + eyeHorizontalShift;
    rightEyeRegion = calculateRegion(
      shiftedCenterX,
      centerY,
      eyeRegionSize,
      eyeRegionSize,
      imageWidth,
      imageHeight
    );
  }

  return {
    leftCheekRegion,
    rightCheekRegion,
    foreheadRegion,
    leftEyeRegion,
    rightEyeRegion,
  };
}

// --- Main Color Extraction Function ---

export const extractSkinAndEyeColors = async (
  imageBuffer: Buffer,
  landmarks: StoredLandmarks
): Promise<ExtractedColors> => {
  // Dynamic import of sharp
  const sharp = (await import("sharp")).default;
  let metadata;
  try {
    metadata = await sharp(imageBuffer).metadata();
  } catch (metaError) {
    console.error("Error getting image metadata:", metaError);
    throw new Error("Could not read image metadata.");
  }

  const imageWidth = metadata.width;
  const imageHeight = metadata.height;

  if (!imageWidth || !imageHeight) {
    throw new Error("Could not determine image dimensions from metadata.");
  }

  // Calculate regions
  const regions = calculateFaceRegions(landmarks, imageWidth, imageHeight);

  // --- BEGIN ADDED LOGGING ---
  console.log("Calculated Regions:", {
    leftCheekRegion: regions.leftCheekRegion,
    rightCheekRegion: regions.rightCheekRegion,
    foreheadRegion: regions.foreheadRegion,
    leftEyeRegion: regions.leftEyeRegion,
    rightEyeRegion: regions.rightEyeRegion,
  });
  // --- END ADDED LOGGING ---

  // Extract colors in parallel
  const [leftCheekRgb, rightCheekRgb, foreheadRgb, leftEyeRgb, rightEyeRgb] =
    await Promise.all([
      getAverageRgbColor(imageBuffer, regions.leftCheekRegion),
      getAverageRgbColor(imageBuffer, regions.rightCheekRegion),
      getAverageRgbColor(imageBuffer, regions.foreheadRegion),
      getAverageRgbColor(imageBuffer, regions.leftEyeRegion),
      getAverageRgbColor(imageBuffer, regions.rightEyeRegion),
    ]);

  // Log extracted RGB values
  console.log("Extracted RGB values:", {
    leftCheekRgb,
    rightCheekRgb,
    foreheadRgb,
    leftEyeRgb,
    rightEyeRgb,
  });

  // Combine skin colors
  const availableSkinRgbs = [leftCheekRgb, rightCheekRgb, foreheadRgb].filter(
    (rgb): rgb is RgbColor => rgb !== null
  );
  let finalSkinRgb: RgbColor | null = null;
  if (availableSkinRgbs.length > 0) {
    const totalR = availableSkinRgbs.reduce((sum, rgb) => sum + rgb.r, 0);
    const totalG = availableSkinRgbs.reduce((sum, rgb) => sum + rgb.g, 0);
    const totalB = availableSkinRgbs.reduce((sum, rgb) => sum + rgb.b, 0);
    finalSkinRgb = {
      r: totalR / availableSkinRgbs.length,
      g: totalG / availableSkinRgbs.length,
      b: totalB / availableSkinRgbs.length,
    };
  }

  // Combine eye colors
  let finalEyeRgb: RgbColor | null = null;
  if (leftEyeRgb && rightEyeRgb) {
    finalEyeRgb = {
      r: (leftEyeRgb.r + rightEyeRgb.r) / 2,
      g: (leftEyeRgb.g + rightEyeRgb.g) / 2,
      b: (leftEyeRgb.b + rightEyeRgb.b) / 2,
    };
  } else {
    finalEyeRgb = leftEyeRgb ?? rightEyeRgb;
  }

  // Log final RGB values
  console.log("Final RGB values:", {
    skin: finalSkinRgb,
    eye: finalEyeRgb,
  });

  const skinColorHex = rgbToHex(finalSkinRgb);
  const averageEyeColorHex = rgbToHex(finalEyeRgb);

  // Log final hex values
  console.log("Final hex values:", {
    skin: skinColorHex,
    eye: averageEyeColorHex,
  });

  return {
    skinColorHex,
    averageEyeColorHex,
  };
};
