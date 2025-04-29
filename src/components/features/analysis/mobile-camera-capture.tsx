"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, RotateCcw, Check, Loader2, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface MobileCameraCaptureProps {
  sessionId: string;
  context?: "primary" | "secondary";
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

type CaptureStatus =
  | "initializing"
  | "streaming"
  | "captured"
  | "uploading"
  | "validating"
  | "success"
  | "error";

export function MobileCameraCapture({
  sessionId,
  context = "primary",
  onSuccess,
  onError,
}: MobileCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<CaptureStatus>("initializing");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Camera Setup ---
  const setupCamera = useCallback(async () => {
    setStatus("initializing"); // Ensure status is set
    setCapturedImageDataUrl(null);
    setErrorMessage(null);

    // Stop any existing stream first
    if (stream) {
      console.log("[MobileCameraCapture] Stopping existing stream tracks.");
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 }, // Keep high res for quality
        audio: false,
      });
      // Check if component is still mounted (or status changed) before proceeding
      if (status !== "initializing") {
        console.warn(
          "[MobileCameraCapture] Status changed during getUserMedia. Stopping new stream."
        );
        newStream.getTracks().forEach((track) => track.stop());
        return;
      }

      setStream(newStream);

      if (videoRef.current) {
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
            return;
          }
          // Fallback: if still initializing but playing, set to streaming
          if (status === "initializing" && videoRef.current.videoWidth > 0) {
            setStatus("streaming");
          }
        };

        videoRef.current.onerror = (e) => {
          console.error("[MobileCameraCapture] Video element error:", e);
          setErrorMessage("Video element failed to load the stream.");
          setStatus("error");
        };
        // --- End Event Listeners ---

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
    // Dependencies: Only include stable functions or props that, if changed, *should* trigger a re-setup.
    // `stream` and `status` state variables are accessed via closure, not needed here.
  }, [onError]);

  // --- Initial Mount Effect ---
  useEffect(() => {
    // Use a small timeout to ensure DOM is ready before setup
    const timerId = setTimeout(() => {
      setupCamera(); // Direct call to setupCamera
    }, 100);

    // --- Component Unmount Cleanup ---
    return () => {
      clearTimeout(timerId);
      // Access stream state directly for cleanup
      setStream((currentStream) => {
        if (currentStream) {
          currentStream.getTracks().forEach((track) => track.stop());
        }
        return null;
      });
    };
  }, [setupCamera]);

  // --- Capture Logic ---
  const handleCapture = useCallback(() => {
    if (
      status !== "streaming" ||
      !videoRef.current ||
      !canvasRef.current ||
      !stream
    )
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (context) {
      // Draw the video frame onto the canvas (mirrored horizontally)
      context.save(); // Save the current state
      context.scale(-1, 1); // Flip horizontally
      context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      context.restore(); // Restore the original state (unflipped)

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9); // Use JPEG with 90% quality
      setCapturedImageDataUrl(dataUrl);
      setStatus("captured");
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    } else {
      console.error("Could not get canvas context.");
      setErrorMessage("Failed to process image capture.");
      setStatus("error");
    }
  }, [status, stream]);

  // --- Retake Logic ---
  const handleRetake = useCallback(() => {
    if (status !== "captured" && status !== "error") {
      console.warn(
        `[MobileCameraCapture] handleRetake called with unexpected status: ${status}`
      );
      return;
    }

    setStatus("initializing");

    setupCamera();
  }, [status, setupCamera]);

  // --- Submit Logic ---
  const handleSubmit = useCallback(async () => {
    if (status !== "captured" || !canvasRef.current || !sessionId) return;

    setStatus("uploading");
    setErrorMessage(null);

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
        let validationSuccessful = false;

        try {
          // 1. Upload
          toast.info("Uploading photo...");
          uploadedBlob = await upload(filename, blob, {
            access: "public",
            handleUploadUrl: `/api/v1/blob/upload?sessionId=${sessionId}`, // Pass sessionId here
          });

          if (!uploadedBlob?.url) {
            throw new Error("Blob upload failed: No URL returned.");
          }
          toast.dismiss();
          toast.info("Validating photo...");
          setStatus("validating");

          // 2. Validate
          const validateResponse = await fetch("/api/v1/analysis/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blobUrl: uploadedBlob.url,
              sessionId,
            }),
          });
          const validateData = await validateResponse.json();

          if (!validateResponse.ok || !validateData.success) {
            throw new Error(
              validateData.message ||
                "Photo validation failed. It might be blurry, poorly lit, or the face wasn't detected clearly."
            );
          }

          // Success
          validationSuccessful = true;
          setStatus("success");
          onSuccess?.();
          toast.dismiss();
          toast.success("Selfie accepted!");
        } catch (err: unknown) {
          console.error("Error during mobile submission:", err);
          const message =
            err instanceof Error
              ? err.message
              : "An unexpected error occurred during processing.";
          setErrorMessage(message);
          setStatus("error");
          onError?.(message);
          toast.dismiss();
          toast.error(message, { duration: 8000 });

          if (uploadedBlob?.url && !validationSuccessful) {
            console.warn(
              `Attempting to delete blob ${uploadedBlob.url} due to error: ${message}`
            );
            fetch("/api/v1/blob/delete", {
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
      0.9
    );
  }, [status, sessionId, onSuccess, onError, context]);

  const isLoading = ["uploading", "validating"].includes(status);
  const showCameraFeed = status === "initializing" || status === "streaming";
  const showPreview =
    (status === "captured" ||
      isLoading ||
      (status === "error" && capturedImageDataUrl)) &&
    capturedImageDataUrl;

  return (
    <div className="flex flex-col h-[100dvh] w-full mx-auto pt-22 gap-8">
      <div className="flex flex-col gap-2 items-center justify-center px-12 mx-auto">
        <h1 className="title">Time to take your selfie! 📸</h1>
        <p className="subtitle">
          Position your face within the outline and take your photo in natural
          daylight.
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>

      {/* Camera View / Preview Area - takes remaining height */}
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center rounded-t-[48px]">
        <div className="absolute inset-0">
          {showCameraFeed && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover scale-x-[-1]",
                status === "initializing" && "opacity-0"
              )}
            />
          )}
          {status === "initializing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-black/50">
              <Loader2 className="h-8 w-8 animate-spin mb-2 text-orange" />
              <span>Starting Camera...</span>
            </div>
          )}
          {showPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedImageDataUrl}
              alt="Captured selfie preview"
              className="w-full h-full object-cover"
            />
          )}
        </div>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-white bg-black/60 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-orange" />
            <span>
              {status === "uploading" ? "Uploading..." : "Validating..."}
            </span>
          </div>
        )}

        {/* overlay */}
        <div className="absolute inset-0">
          <Image
            src="/assets/overlay.png"
            alt="Camera Overlay"
            fill
            className="object-cover scale-105"
          />
        </div>

        {/* Bottom Action Bar */}
        <div className="absolute bottom-0 z-10 w-full pb-12 flex justify-center px-8">
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
              <p className="text-base font-medium text-white">
                {context === "secondary"
                  ? "✅ Success! You can now return to your original device."
                  : "✅ Success! Selfie captured."}
              </p>
            </div>
          )}

          {/* Error Message Area */}
          {status === "error" && errorMessage && (
            <div className="text-center space-y-3 pt-4 w-full">
              <p className="text-red-600 dark:text-red-400 flex items-center justify-center gap-2">
                <X className="h-5 w-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </p>
              {(capturedImageDataUrl ||
                (errorMessage !==
                  "Could not access camera. Please ensure permissions are granted." &&
                  errorMessage !==
                    "Camera access denied. Please grant permission in browser settings." && // Corrected typo
                  errorMessage !== "No camera found on this device." &&
                  !errorMessage.startsWith("Internal error:"))) && (
                <Button onClick={handleRetake} variant="secondary" size="lg">
                  <RotateCcw className="mr-2 size-4" /> Try again
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
