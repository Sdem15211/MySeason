import type sharp from "sharp";

// Simple landmark position interface
export interface IPosition {
  x: number | null | undefined;
  y: number | null | undefined;
  z: number | null | undefined;
}

// Define a type for the expected landmark strings from Google Vision API
export type VisionLandmarkTypeString =
  | "UNKNOWN_LANDMARK"
  | "LEFT_EYE"
  | "RIGHT_EYE"
  | "LEFT_OF_LEFT_EYEBROW"
  | "RIGHT_OF_LEFT_EYEBROW"
  | "LEFT_OF_RIGHT_EYEBROW"
  | "RIGHT_OF_RIGHT_EYEBROW"
  | "MIDPOINT_BETWEEN_EYES"
  | "NOSE_TIP"
  | "UPPER_LIP"
  | "LOWER_LIP"
  | "MOUTH_LEFT"
  | "MOUTH_RIGHT"
  | "MOUTH_CENTER"
  | "NOSE_BOTTOM_RIGHT"
  | "NOSE_BOTTOM_LEFT"
  | "NOSE_BOTTOM_CENTER"
  | "LEFT_EYE_TOP_BOUNDARY"
  | "LEFT_EYE_RIGHT_CORNER"
  | "LEFT_EYE_BOTTOM_BOUNDARY"
  | "LEFT_EYE_LEFT_CORNER"
  | "RIGHT_EYE_TOP_BOUNDARY"
  | "RIGHT_EYE_RIGHT_CORNER"
  | "RIGHT_EYE_BOTTOM_BOUNDARY"
  | "RIGHT_EYE_LEFT_CORNER"
  | "LEFT_EYEBROW_UPPER_MIDPOINT"
  | "RIGHT_EYEBROW_UPPER_MIDPOINT"
  | "LEFT_EAR_TRAGION"
  | "RIGHT_EAR_TRAGION"
  | "LEFT_EYE_PUPIL"
  | "RIGHT_EYE_PUPIL"
  | "FOREHEAD_GLABELLA"
  | "CHIN_GNATHION"
  | "CHIN_LEFT_GONION"
  | "CHIN_RIGHT_GONION"
  | "LEFT_CHEEK_CENTER"
  | "RIGHT_CHEEK_CENTER";

// Landmark structure received from API (using string type)
export interface StoredLandmark {
  type?: VisionLandmarkTypeString | string | null; // Allow general string for flexibility, but prefer VisionLandmarkTypeString
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
  leftEyebrowRegion: sharp.Region | null; // Added
  rightEyebrowRegion: sharp.Region | null; // Added
};

// Possible undertone categories
export type SkinUndertone =
  | "Warm"
  | "Cool"
  | "Neutral"
  | "Olive"
  | "Undetermined";

// Final extracted colors (updated)
export type ExtractedColors = {
  skinColorHex: string | null;
  averageEyeColorHex: string | null;
  skinUndertone: SkinUndertone | null;
  skinColorLab?: { l: number; a: number; b: number } | null; // Added for debugging
  averageEyebrowColorHex: string | null;
};

// RGB color type
export type RgbColor = { r: number; g: number; b: number };
