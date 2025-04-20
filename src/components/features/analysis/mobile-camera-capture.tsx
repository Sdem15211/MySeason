"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, RotateCcw, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileCameraCaptureProps {
  sessionId: string;
  context?: "primary" | "secondary"; // Added context prop
  onSuccess?: () => void; // Optional callback
  onError?: (message: string) => void; // Optional callback
}

type CaptureStatus =
  | "initializing" // Camera starting up
  | "streaming" // Camera active, ready to capture
  | "captured" // Photo taken, showing preview
  | "uploading"
  | "validating"
  | "success"
  | "error";

const instructionText =
  "Position your face in the center. Ensure you are in a well-lit area, preferably with natural daylight, and avoid shadows.";

export function MobileCameraCapture({
  sessionId,
  context = "primary", // Default context to primary
  onSuccess,
  onError,
}: MobileCameraCaptureProps) {
  console.log("[MobileCameraCapture] Component rendering started.");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<CaptureStatus>("initializing");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Camera Setup (Reverted to single function) ---
  const setupCamera = useCallback(async () => {
    console.log("[MobileCameraCapture] Running setupCamera...");
    setStatus("initializing"); // Ensure status is set
    setCapturedImageDataUrl(null);
    setErrorMessage(null);

    // Stop any existing stream first
    if (stream) {
      console.log("[MobileCameraCapture] Stopping existing stream tracks.");
      stream.getTracks().forEach((track) => track.stop());
      setStream(null); // Clear previous stream state
    }

    try {
      console.log("[MobileCameraCapture] Requesting media stream...");
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false,
      });
      console.log("[MobileCameraCapture] Media stream acquired.", newStream);

      // Check if component is still mounted (or status changed) before proceeding
      // This check might be redundant if called correctly, but adds safety
      if (status !== "initializing") {
        console.warn(
          "[MobileCameraCapture] Status changed during getUserMedia. Stopping new stream."
        );
        newStream.getTracks().forEach((track) => track.stop());
        return;
      }

      setStream(newStream); // Set the new stream state

      if (videoRef.current) {
        console.log(
          "[MobileCameraCapture] videoRef is current. Assigning srcObject..."
        );
        videoRef.current.srcObject = newStream;

        // --- Event Listeners ---
        videoRef.current.onloadedmetadata = () => {
          // Check ref still exists
          if (!videoRef.current) {
            console.warn(
              "[MobileCameraCapture] onloadedmetadata: videoRef became null."
            );
            return;
          }
          console.log("[MobileCameraCapture] onloadedmetadata event fired.");
          console.log(
            `[MobileCameraCapture] Video dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`
          );
          if (
            videoRef.current.videoWidth > 0 &&
            videoRef.current.videoHeight > 0
          ) {
            setStatus("streaming");
          } else {
            console.warn(
              "[MobileCameraCapture] onloadedmetadata: Video dimensions are 0."
            );
          }
        };

        videoRef.current.onplaying = () => {
          if (!videoRef.current) {
            console.warn(
              "[MobileCameraCapture] onplaying: videoRef became null."
            );
            return;
          }
          console.log("[MobileCameraCapture] onplaying event fired.");
          // Fallback: if still initializing but playing, set to streaming
          if (status === "initializing" && videoRef.current.videoWidth > 0) {
            console.log(
              "[MobileCameraCapture] onplaying: Forcing status to streaming."
            );
            setStatus("streaming");
          }
        };

        videoRef.current.onerror = (e) => {
          console.error("[MobileCameraCapture] Video element error:", e);
          setErrorMessage("Video element failed to load the stream.");
          setStatus("error");
        };
        // --- End Event Listeners ---

        console.log(
          "[MobileCameraCapture] srcObject assigned. Attempting to play..."
        );
        // Attempt to play
        videoRef.current.play().catch((err) => {
          console.error("[MobileCameraCapture] Video play() failed:", err);
          if (err.name === "NotAllowedError") {
            setErrorMessage(
              "Browser prevented camera playback. Ensure autoplay is allowed."
            );
          } else {
            setErrorMessage("Failed to start camera video stream.");
          }
          setStatus("error");
        });
      } else {
        // This should ideally not happen if called correctly after setStatus('initializing')
        console.error(
          "[MobileCameraCapture] setupCamera: videoRef is null *after* getUserMedia. Cannot setup camera."
        );
        setStatus("error");
        setErrorMessage(
          "Internal error: Camera component failed to initialize (ref missing)."
        );
        onError?.(
          "Internal error: Camera component failed to initialize (ref missing)."
        );
        // Stop the stream we just acquired
        newStream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    } catch (err) {
      console.error("[MobileCameraCapture] Error during setupCamera:", err);
      let message =
        "Could not access camera. Please ensure permissions are granted.";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          message =
            "Camera access denied. Please grant permission in browser settings.";
        } else if (err.name === "NotFoundError") {
          message = "No camera found on this device.";
        } else {
          message = `Camera error: ${err.message}`;
        }
      }
      setErrorMessage(message);
      setStatus("error");
      onError?.(message);
      toast.error(message);
    }
    // Dependencies: Include stream, status, onError. Status is needed for the early exit check.
  }, [stream, status, onError]);

  // --- Initial Mount Effect ---
  useEffect(() => {
    console.log("[MobileCameraCapture] Mount effect running.");
    // Use a small timeout to ensure DOM is ready before setup
    const timerId = setTimeout(() => {
      console.log(
        "[MobileCameraCapture] Mount effect: Timer expired, calling setupCamera."
      );
      setupCamera(); // Direct call to setupCamera
    }, 100);

    // --- Component Unmount Cleanup ---
    return () => {
      console.log(
        "[MobileCameraCapture] Unmount cleanup: Clearing timer and stopping any active stream."
      );
      clearTimeout(timerId);
      // Use ref callback to get stream for cleanup
      stream?.getTracks().forEach((track) => track.stop());
    };
    // Dependency: setupCamera (stable via useCallback). Stream is handled implicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupCamera]); // Reverted dependencies

  // --- Capture Logic ---
  const handleCapture = useCallback(() => {
    if (
      status !== "streaming" ||
      !videoRef.current ||
      !canvasRef.current ||
      !stream
    )
      return;

    console.log("Capturing photo...");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // Set canvas size to match video stream dimensions for accurate capture
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (context) {
      // Flip the image horizontally if desired (like a mirror)
      context.scale(-1, 1);
      context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9); // Use JPEG with 90% quality
      setCapturedImageDataUrl(dataUrl);
      setStatus("captured");
      console.log("Photo captured.");
      // Stop the stream *after* capture to show the preview
      stream.getTracks().forEach((track) => track.stop());
      setStream(null); // Clear the stream state
    } else {
      console.error("Could not get canvas context.");
      setErrorMessage("Failed to process image capture.");
      setStatus("error");
    }
  }, [status, stream]);

  // --- Retake Logic (Modified) ---
  const handleRetake = useCallback(() => {
    // Check current status to avoid calling if already initializing etc.
    if (status !== "captured" && status !== "error") {
      console.warn(
        `[MobileCameraCapture] handleRetake called with unexpected status: ${status}`
      );
      return;
    }
    console.log(`[MobileCameraCapture] Retaking photo from status: ${status}`);

    // 1. Set status to initializing FIRST to ensure video element is rendered
    setStatus("initializing");

    // 2. Call setupCamera *after* a minimal delay
    // This allows React to process the state update and render the video element
    const retakeTimeoutId = setTimeout(() => {
      console.log(
        "[MobileCameraCapture] handleRetake: setTimeout finished, calling setupCamera."
      );
      setupCamera();
    }, 10); // Small delay (10ms)

    // Optional: Clear timeout if component unmounts quickly (though unlikely here)
    // return () => clearTimeout(retakeTimeoutId);
  }, [status, setupCamera]); // Depend on status and setupCamera

  // --- Submit Logic ---
  const handleSubmit = useCallback(async () => {
    if (status !== "captured" || !canvasRef.current || !sessionId) return;

    setStatus("uploading");
    setErrorMessage(null);
    console.log(`Submitting photo for session ${sessionId}...`);

    canvasRef.current.toBlob(
      async (blob) => {
        if (!blob) {
          const msg = "Failed to create image blob for upload.";
          setErrorMessage(msg);
          setStatus("error");
          onError?.(msg);
          toast.error(msg);
          console.error(msg);
          return;
        }

        const filename = `${sessionId}-selfie.jpg`;
        let uploadedBlob: PutBlobResult | null = null;
        let validationSuccessful = false; // Flag to track validation step

        try {
          // 1. Upload
          console.log(`Uploading blob: ${filename}`);
          toast.info("Uploading photo...");
          uploadedBlob = await upload(filename, blob, {
            access: "public",
            handleUploadUrl: `/api/v1/blob/upload?sessionId=${sessionId}`, // Pass sessionId here
          });
          console.log("Upload complete:", uploadedBlob);

          if (!uploadedBlob?.url) {
            throw new Error("Blob upload failed: No URL returned.");
          }
          toast.dismiss(); // Clear previous toasts
          toast.info("Validating photo...");
          // 2. Validate
          setStatus("validating");
          console.log(
            `Validating blob ${uploadedBlob.url} for session ${sessionId}`
          );
          const validateResponse = await fetch("/api/v1/analysis/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blobUrl: uploadedBlob.url,
              sessionId, // Pass sessionId here too
            }),
          });
          const validateData = await validateResponse.json();
          console.log("Validation response:", validateData);

          if (!validateResponse.ok || !validateData.success) {
            // Validation failed, keep blobResult for potential deletion
            throw new Error(
              validateData.message ||
                "Photo validation failed. It might be blurry, poorly lit, or the face wasn't detected clearly."
            );
          }

          // Success
          validationSuccessful = true; // Mark validation as successful
          console.log(
            `Validation successful for session: ${sessionId}, Context: ${context}`
          );
          setStatus("success");
          onSuccess?.();
          toast.dismiss();
          // *** CONTEXT-AWARE TOAST ***
          if (context === "secondary") {
            toast.success(
              "Selfie accepted! You can return to your other device."
            );
          } else {
            toast.success("Selfie accepted!"); // Simpler message for primary context
          }
        } catch (err: unknown) {
          console.error("Error during mobile submission:", err);
          const message =
            err instanceof Error
              ? err.message
              : "An unexpected error occurred during processing.";
          setErrorMessage(message);
          setStatus("error"); // Set status to error to show error message and retake option
          onError?.(message);
          toast.dismiss();
          toast.error(message, { duration: 8000 }); // Show error for longer

          // Attempt to delete blob only if upload succeeded but validation failed OR another error occurred after upload
          if (uploadedBlob?.url && !validationSuccessful) {
            console.warn(
              `Attempting to delete blob ${uploadedBlob.url} due to error: ${message}`
            );
            // Don't await deletion, fire and forget is acceptable here
            fetch("/api/v1/blob/delete", {
              // Ensure this endpoint exists and is secured
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ blobUrl: uploadedBlob.url, sessionId }),
            }).catch((deleteError) =>
              console.error("Failed to send delete request:", deleteError)
            );
          }
        }
      },
      "image/jpeg",
      0.9 // Match the capture format and quality
    );
  }, [status, sessionId, onSuccess, onError, context]); // Added context to dependency array

  const isLoading = ["uploading", "validating"].includes(status);

  return (
    <div className="flex flex-col items-center space-y-4 p-4 w-full max-w-md mx-auto">
      {/* Instruction Text */}
      {status !== "success" && (
        <p className="text-sm text-center text-muted-foreground mb-2 px-4">
          {instructionText}
        </p>
      )}

      {/* Canvas for processing, hidden from user */}
      <canvas ref={canvasRef} className="hidden"></canvas>

      {/* Camera View / Preview Area */}
      <div className="relative w-full aspect-[3/4] border rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center shadow-inner">
        {/* Render video element if initializing OR streaming */}
        {(status === "initializing" || status === "streaming") && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted // Mute to avoid potential audio feedback loops
            // Visually hide if only initializing, show if streaming
            className={cn(
              "w-full h-full object-cover scale-x-[-1]", // Base styles + mirror mode
              status === "initializing" && "opacity-0" // Hide visually during init
            )}
          />
        )}
        {/* Show initializing indicator ON TOP of the hidden video */}
        {status === "initializing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <span>Starting Camera...</span>
          </div>
        )}
        {/* Preview Image - Render if captured, loading, or error occurred after capture */}
        {(status === "captured" ||
          isLoading ||
          (status === "error" && capturedImageDataUrl)) &&
          capturedImageDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedImageDataUrl}
              alt="Captured selfie preview"
              className="w-full h-full object-cover"
            />
          )}
        {/* Add face overlay SVG/HTML here positioned absolutely */}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full pt-2">
        {status === "streaming" && (
          <Button
            onClick={handleCapture}
            size="lg"
            className="rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shadow-lg"
          >
            <Camera className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="sr-only">Capture Photo</span>
          </Button>
        )}

        {status === "captured" && !isLoading && (
          // Show options only after capture and when not loading
          <>
            <Button
              onClick={handleRetake}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              <RotateCcw className="mr-2 h-5 w-5" /> Retake
            </Button>
            <Button
              onClick={handleSubmit}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Check className="mr-2 h-5 w-5" /> Use Photo
            </Button>
          </>
        )}

        {isLoading && (
          // Show loading indicator covering buttons
          <div className="flex items-center justify-center space-x-2 text-muted-foreground w-full py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>
              {status === "uploading" ? "Uploading..." : "Validating..."}
            </span>
          </div>
        )}
      </div>

      {/* Success Message */}
      {status === "success" && (
        <p className="text-lg text-center font-medium text-green-600 dark:text-green-400 pt-4">
          {/* *** CONTEXT-AWARE SUCCESS MESSAGE *** */}
          {context === "secondary"
            ? "✅ Success! You can now return to your original device."
            : "✅ Success! Selfie captured."}
        </p>
      )}

      {/* Error Message and Retry Option */}
      {status === "error" && errorMessage && (
        <div className="text-center space-y-3 pt-4 w-full">
          <p className="text-red-600 dark:text-red-400">{errorMessage}</p>
          {/* Allow retake if the error didn't originate from camera initialization */}
          {errorMessage !==
            "Could not access camera. Please ensure permissions are granted." &&
            errorMessage !==
              "Camera access denied. Please grant permission in your browser settings." &&
            errorMessage !== "No camera found on this device." && (
              <Button onClick={handleRetake} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            )}
        </div>
      )}
    </div>
  );
}
