"use client";

import { useState, useEffect, useCallback } from "react";
// Removed: import { upload } from "@vercel/blob/client";
// Removed: import type { PutBlobResult } from "@vercel/blob";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, RotateCcw, Loader2, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image"; // Import Next Image

interface MobileCameraCaptureDevProps {
  sessionId?: string; // Make optional for dev
  context?: "primary" | "secondary";
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

type CaptureStatus =
  | "initializing" // Keep initializing state
  | "streaming"
  | "captured"
  | "uploading"
  | "validating"
  | "success"
  | "error";

export default function MobileCameraCaptureDev({
  sessionId = "dev-session", // Provide a default dev session ID
  context = "primary",
  onSuccess,
  onError,
}: MobileCameraCaptureDevProps) {
  // Removed: videoRef, canvasRef, stream state
  const [status, setStatus] = useState<CaptureStatus>("streaming"); // Start in streaming state
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Removed Camera Setup ---
  // Removed: setupCamera, useEffect for camera setup/cleanup

  // --- Mock Capture Logic ---
  const handleCapture = useCallback(() => {
    if (status !== "streaming") return;
    console.log("[Dev] Simulating capture...");
    setCapturedImageDataUrl("placeholder"); // Use placeholder
    setStatus("captured");
    setErrorMessage(null); // Clear error on capture
  }, [status]);

  // --- Mock Retake Logic ---
  const handleRetake = useCallback(() => {
    if (status !== "captured" && status !== "error") {
      console.warn(
        `[Dev] handleRetake called with unexpected status: ${status}`
      );
      // Allow retake from success too for testing
      // return;
    }
    console.log("[Dev] Simulating retake...");
    setStatus("streaming"); // Go back to 'streaming'
    setCapturedImageDataUrl(null);
    setErrorMessage(null);
  }, [status]); // Removed setupCamera dependency

  // --- Mock Submit Logic ---
  const handleSubmit = useCallback(async () => {
    if (status !== "captured" || !capturedImageDataUrl || !sessionId) return;

    console.log("[Dev] Simulating submit...");
    setStatus("uploading");
    setErrorMessage(null);
    toast.info("Simulating upload...");

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate validation
    setStatus("validating");
    toast.dismiss();
    toast.info("Simulating validation...");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate success
    setStatus("success");
    onSuccess?.();
    toast.dismiss();
    toast.success(
      context === "secondary"
        ? "Selfie accepted! You can return to your other device."
        : "Selfie accepted!"
    );
  }, [status, sessionId, onSuccess, context, capturedImageDataUrl]); // Added capturedImageDataUrl

  // --- Simulate Error ---
  const handleSimulateError = useCallback(
    (type: "validation" | "upload" | "camera" | "generic") => {
      console.log(`[Dev] Simulating ${type} error...`);
      let msg = "A simulated error occurred.";
      switch (type) {
        case "validation":
          msg = "Simulated: Photo validation failed. Face not clear enough.";
          // Keep image visible for validation error
          if (!capturedImageDataUrl) setCapturedImageDataUrl("placeholder");
          break;
        case "upload":
          msg = "Simulated: Upload failed due to network issue.";
          // Keep image visible for upload error
          if (!capturedImageDataUrl) setCapturedImageDataUrl("placeholder");
          break;
        case "camera":
          msg = "Simulated: Could not access camera.";
          // No image for camera error
          setCapturedImageDataUrl(null);
          break;
        case "generic":
          msg = "Simulated: An unexpected internal error happened.";
          // Image might or might not exist depending on when it happened
          break;
      }
      setErrorMessage(msg);
      setStatus("error");
      onError?.(msg);
      toast.error(msg, { duration: 5000 });
    },
    [onError, capturedImageDataUrl] // Added capturedImageDataUrl dependency
  );

  const isLoading = ["uploading", "validating"].includes(status);
  // Show "camera feed" area (just a background) when streaming or initializing
  const showCameraFeedArea =
    status === "initializing" || status === "streaming";
  // Show preview if captured, loading, or in error state *with* an image URL
  const showPreview =
    (status === "captured" || isLoading || status === "error") &&
    capturedImageDataUrl;

  return (
    <div className="flex flex-col h-screen w-full mx-auto pt-22 gap-8">
      <div className="flex flex-col gap-2 items-center justify-center px-12 mx-auto">
        <h1 className="title">Time to take your selfie! 📸</h1>
        <p className="subtitle">
          Position your face within the outline and take your photo in natural
          daylight.
        </p>
      </div>
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center rounded-t-[48px]">
        {/* Main image video feed */}
        {showCameraFeedArea && !showPreview && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-neutral-400">
            {status === "initializing" ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin mb-2 text-orange" />
                <span>Initializing UI...</span>
              </>
            ) : (
              <>
                <Camera className="h-16 w-16 text-neutral-600" />
                <span className="mt-2">Camera View Area</span>
                <span className="text-xs">(No actual camera feed)</span>
              </>
            )}
          </div>
        )}
        {/* overlay */}
        <div className="absolute inset-0">
          <Image
            src="/assets/overlay.png"
            alt="Camera Overlay"
            fill
            className="object-cover"
          />
        </div>
        {/* Bottom Action Bar */}
        <div className="absolute bottom-0 z-10 w-full pb-12 flex justify-center px-8">
          {/* Capture Button */}
          {status === "streaming" && (
            <Button
              onClick={handleCapture}
              aria-label="Capture Photo"
              className="size-18 rounded-2xl flex items-center justify-center bg-orange ring-4 ring-offset-3 ring-orange ring-offset-black/50 active:bg-orange/70 hover:bg-orange"
              variant="ghost"
            ></Button>
          )}

          {/* Retake/Submit Buttons */}
          {status === "captured" && !isLoading && (
            <div className="flex justify-between items-center space-x-4 w-full">
              <Button onClick={handleRetake} variant="secondary" size="lg">
                <RotateCcw className="mr-2 size-4" /> Retake
              </Button>
              <Button onClick={handleSubmit} variant="season" size="lg">
                Use Photo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Success Message */}
          {status === "success" && (
            <div className="text-center pt-4 space-y-3">
              <p className="text-lg font-medium text-green-600 dark:text-green-400">
                {context === "secondary"
                  ? "✅ Success! You can now return to your original device."
                  : "✅ Success! Selfie captured."}
              </p>
              <Button onClick={handleRetake} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" /> Test Again
              </Button>
            </div>
          )}

          {/* Error Message */}
          {status === "error" && errorMessage && (
            <div className="text-center space-y-3 pt-4 w-full">
              <p className="text-red-600 dark:text-red-400 flex items-center justify-center gap-2">
                <X className="h-5 w-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </p>
              {/* Always show "Try Again" button in error state for dev */}
              <Button onClick={handleRetake} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </div>
          )}
        </div>
        {/* Preview Image */}
        {showPreview && capturedImageDataUrl && (
          <Image // Use Next Image
            src={capturedImageDataUrl}
            alt="Captured selfie preview"
            fill // Use fill to cover the container
            className="object-cover" // Ensure image covers the area
            priority // Prioritize loading the preview image
          />
        )}
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-white bg-black/60 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-orange" />
            <span>
              {status === "uploading" ? "Uploading..." : "Validating..."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
