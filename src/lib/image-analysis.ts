import type sharp from "sharp";
import convert from "color-convert";
import {
  StoredLandmark,
  StoredLandmarks,
  CalculatedRegions,
  SkinUndertone,
  ExtractedColors,
  RgbColor,
  VisionLandmarkTypeString,
} from "./types/image-analysis.types";

// --- Helper Functions ---

const findLandmark = (
  landmarks: StoredLandmarks,
  typeString: VisionLandmarkTypeString | string
): StoredLandmark | undefined => {
  if (!landmarks || !typeString) return undefined;

  const upperTypeString = typeString.toUpperCase();

  return landmarks.find((lm) => {
    if (!lm || !lm.type) return false;
    return (
      typeof lm.type === "string" && lm.type.toUpperCase() === upperTypeString
    );
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
    // Optional: Add logging here if a region is out of bounds
    // console.warn(`Calculated region out of bounds: ${JSON.stringify({ left, top, width: regionWidth, height: regionHeight })} for image ${imageWidth}x${imageHeight}`);
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
    const intRegion: sharp.Region = {
      left: Math.round(region.left),
      top: Math.round(region.top),
      width: Math.max(1, Math.round(region.width)),
      height: Math.max(1, Math.round(region.height)),
    };

    const { default: sharp } = await import("sharp");
    const extractedBuffer = await sharp(imageBuffer)
      .extract(intRegion)
      .toBuffer();

    const stats = await sharp(extractedBuffer).toColorspace("srgb").stats();
    const channels = stats.channels;

    if (channels && channels.length >= 3) {
      return {
        r: channels[0]?.mean ?? 0,
        g: channels[1]?.mean ?? 0,
        b: channels[2]?.mean ?? 0,
      };
    }
    console.warn(
      `Could not get valid channel data for region: ${JSON.stringify(
        intRegion
      )}`
    );
    return null;
  } catch (error) {
    console.error(
      `Error extracting color for region ${JSON.stringify(region)}:`,
      error
    );
    return null;
  }
};

// --- Undertone Calculation ---
const calculateUndertoneFromRgb = (
  rgb: RgbColor | null
): SkinUndertone | null => {
  if (!rgb) return null;

  try {
    const clampedR = Math.max(0, Math.min(255, rgb.r));
    const clampedG = Math.max(0, Math.min(255, rgb.g));
    const clampedB = Math.max(0, Math.min(255, rgb.b));
    const [l, a, b] = convert.rgb.lab([clampedR, clampedG, clampedB]);

    const NEUTRAL_A_THRESHOLD = 8.0;
    const NEUTRAL_B_THRESHOLD = 8.0;

    const WARM_B_MIN = 15.0;
    const WARM_A_MIN = 0.0;

    const COOL_B_MAX = 9.0;
    const COOL_A_MAX = 12.0;

    const OLIVE_A_MAX = 6.0;
    const OLIVE_A_MIN = -6.0;
    const OLIVE_B_MIN = 8.0;
    const OLIVE_B_MAX = 24.0;

    if (
      Math.abs(a) <= NEUTRAL_A_THRESHOLD &&
      Math.abs(b) <= NEUTRAL_B_THRESHOLD
    ) {
      return "Neutral";
    }

    if (b >= WARM_B_MIN && a >= WARM_A_MIN) {
      return "Warm";
    }

    if (b <= COOL_B_MAX && a <= COOL_A_MAX) {
      if (a >= OLIVE_A_MIN && a <= OLIVE_A_MAX && b >= OLIVE_B_MIN) {
      } else {
        return "Cool";
      }
    }

    if (
      a >= OLIVE_A_MIN &&
      a <= OLIVE_A_MAX &&
      b >= OLIVE_B_MIN &&
      b <= OLIVE_B_MAX
    ) {
      if (!(b >= WARM_B_MIN && a >= WARM_A_MIN)) {
        return "Olive";
      }
    }

    console.warn(
      "Could not determine a definitive undertone category based on refined thresholds.",
      { l: l.toFixed(1), a: a.toFixed(1), b: b.toFixed(1) }
    );
    return "Undetermined";
  } catch (error) {
    console.error(
      "Error converting RGB to Lab or calculating undertone:",
      error
    );
    return null;
  }
};

// --- Region Calculation Logic ---

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
      leftEyebrowRegion: null,
      rightEyebrowRegion: null,
    };
  }

  const baseRegionSize = Math.max(
    10,
    Math.round(Math.min(imageWidth, imageHeight) * 0.05)
  );

  // Find necessary landmarks (Skin) - Use standard API string types
  const leftCheek = findLandmark(landmarks, "LEFT_CHEEK_CENTER");
  const rightCheek = findLandmark(landmarks, "RIGHT_CHEEK_CENTER");
  const foreheadGlabella = findLandmark(landmarks, "FOREHEAD_GLABELLA");

  // Find necessary landmarks (Eyes) - Use standard API string types
  const leftEyeLeftCorner = findLandmark(landmarks, "LEFT_EYE_LEFT_CORNER");
  const leftEyeRightCorner = findLandmark(landmarks, "LEFT_EYE_RIGHT_CORNER");
  const leftEyeTopBoundary = findLandmark(landmarks, "LEFT_EYE_TOP_BOUNDARY");
  const leftEyeBottomBoundary = findLandmark(
    landmarks,
    "LEFT_EYE_BOTTOM_BOUNDARY"
  );
  const rightEyeLeftCorner = findLandmark(landmarks, "RIGHT_EYE_LEFT_CORNER");
  const rightEyeRightCorner = findLandmark(landmarks, "RIGHT_EYE_RIGHT_CORNER");
  const rightEyeTopBoundary = findLandmark(landmarks, "RIGHT_EYE_TOP_BOUNDARY");
  const rightEyeBottomBoundary = findLandmark(
    landmarks,
    "RIGHT_EYE_BOTTOM_BOUNDARY"
  );

  // Find necessary landmarks (Eyebrows) - Use standard API string types
  const leftOfLeftEyebrow = findLandmark(landmarks, "LEFT_OF_LEFT_EYEBROW");
  const rightOfLeftEyebrow = findLandmark(landmarks, "RIGHT_OF_LEFT_EYEBROW");
  const leftEyebrowUpperMidpoint = findLandmark(
    landmarks,
    "LEFT_EYEBROW_UPPER_MIDPOINT"
  );
  const leftOfRightEyebrow = findLandmark(landmarks, "LEFT_OF_RIGHT_EYEBROW");
  const rightOfRightEyebrow = findLandmark(landmarks, "RIGHT_OF_RIGHT_EYEBROW");
  const rightEyebrowUpperMidpoint = findLandmark(
    landmarks,
    "RIGHT_EYEBROW_UPPER_MIDPOINT"
  );

  // --- Calculate Skin Regions --- Original logic restored
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
    // Original Shift
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

  // --- Calculate Eye Regions --- Original logic restored
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
    // Original shift
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
    // Original shift
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

  // --- Calculate Eyebrow Regions --- Added
  const eyebrowRegionWidth = Math.max(6, Math.round(baseRegionSize * 0.6));
  const eyebrowRegionHeight = Math.max(3, Math.round(baseRegionSize * 0.2));

  let leftEyebrowRegion: sharp.Region | null = null;
  if (
    leftOfLeftEyebrow?.position?.x != null &&
    rightOfLeftEyebrow?.position?.x != null &&
    leftEyebrowUpperMidpoint?.position?.y != null
  ) {
    const centerX =
      (leftOfLeftEyebrow.position.x + rightOfLeftEyebrow.position.x) / 2;
    const centerY = leftEyebrowUpperMidpoint.position.y;
    const eyebrowVerticalShift = Math.round(eyebrowRegionHeight * 1); // Shift down slightly from upper midpoint
    const shiftedCenterY = centerY + eyebrowVerticalShift;

    leftEyebrowRegion = calculateRegion(
      centerX,
      shiftedCenterY,
      eyebrowRegionWidth,
      eyebrowRegionHeight,
      imageWidth,
      imageHeight
    );
  }

  let rightEyebrowRegion: sharp.Region | null = null;
  if (
    leftOfRightEyebrow?.position?.x != null &&
    rightOfRightEyebrow?.position?.x != null &&
    rightEyebrowUpperMidpoint?.position?.y != null
  ) {
    const centerX =
      (leftOfRightEyebrow.position.x + rightOfRightEyebrow.position.x) / 2;
    const centerY = rightEyebrowUpperMidpoint.position.y;
    const eyebrowVerticalShift = Math.round(eyebrowRegionHeight * 1);
    const shiftedCenterY = centerY + eyebrowVerticalShift;

    rightEyebrowRegion = calculateRegion(
      centerX,
      shiftedCenterY,
      eyebrowRegionWidth,
      eyebrowRegionHeight,
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
    leftEyebrowRegion,
    rightEyebrowRegion,
  };
}

// --- Main Color Extraction Function (Renamed) ---

export const extractFacialColors = async (
  imageBuffer: Buffer,
  landmarks: StoredLandmarks
): Promise<ExtractedColors> => {
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

  // Calculate all necessary regions
  const regions = calculateFaceRegions(landmarks, imageWidth, imageHeight);

  // Extract colors in parallel for all regions
  const [
    leftCheekRgb,
    rightCheekRgb,
    foreheadRgb,
    leftEyeRgb,
    rightEyeRgb,
    leftEyebrowRgb,
    rightEyebrowRgb,
  ] = await Promise.all([
    getAverageRgbColor(imageBuffer, regions.leftCheekRegion),
    getAverageRgbColor(imageBuffer, regions.rightCheekRegion),
    getAverageRgbColor(imageBuffer, regions.foreheadRegion),
    getAverageRgbColor(imageBuffer, regions.leftEyeRegion),
    getAverageRgbColor(imageBuffer, regions.rightEyeRegion),
    getAverageRgbColor(imageBuffer, regions.leftEyebrowRegion),
    getAverageRgbColor(imageBuffer, regions.rightEyebrowRegion),
  ]);

  // --- Combine Skin Colors --- Original logic restored
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

  // --- Combine Eye Colors --- Original logic restored
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

  // --- Combine Eyebrow Colors --- Added & Linter Fixed
  let finalEyebrowRgb: RgbColor | null = null;
  const availableEyebrowRgbs = [leftEyebrowRgb, rightEyebrowRgb].filter(
    (rgb): rgb is RgbColor => rgb !== null
  );
  if (availableEyebrowRgbs.length === 2) {
    // Both eyebrows detected
    finalEyebrowRgb = {
      r: (availableEyebrowRgbs[0]!.r + availableEyebrowRgbs[1]!.r) / 2,
      g: (availableEyebrowRgbs[0]!.g + availableEyebrowRgbs[1]!.g) / 2,
      b: (availableEyebrowRgbs[0]!.b + availableEyebrowRgbs[1]!.b) / 2,
    };
  } else if (availableEyebrowRgbs.length === 1) {
    // Only one eyebrow detected
    finalEyebrowRgb = availableEyebrowRgbs[0]!;
  }

  // Calculate Undertone
  const skinUndertone = calculateUndertoneFromRgb(finalSkinRgb);

  // Calculate Lab values for skin if possible (for debugging/display)
  let skinColorLab: { l: number; a: number; b: number } | null = null;
  if (finalSkinRgb) {
    try {
      const [l, a, b] = convert.rgb.lab([
        Math.max(0, Math.min(255, finalSkinRgb.r)),
        Math.max(0, Math.min(255, finalSkinRgb.g)),
        Math.max(0, Math.min(255, finalSkinRgb.b)),
      ]);
      skinColorLab = { l, a, b };
    } catch (labError) {
      console.error(
        "Error converting final skin RGB to Lab for reporting:",
        labError
      );
    }
  }

  // Convert final RGBs to Hex
  const skinColorHex = rgbToHex(finalSkinRgb);
  const averageEyeColorHex = rgbToHex(finalEyeRgb);
  const averageEyebrowColorHex = rgbToHex(finalEyebrowRgb);

  return {
    skinColorHex,
    averageEyeColorHex,
    skinUndertone,
    skinColorLab,
    averageEyebrowColorHex,
  };
};
