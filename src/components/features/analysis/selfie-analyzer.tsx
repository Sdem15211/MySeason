"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Upload } from "lucide-react";
import { MobileCameraCapture } from "./mobile-camera-capture";
import { upload } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";

interface SelfieAnalyzerProps {
  sessionId: string;
  className?: string;
}

type Status =
  | "idle"
  | "desktop_qr"
  | "mobile_capture"
  | "polling_failed"
  | "validation_failed"
  | "redirecting"
  | "error";

const POLLING_INTERVAL_MS = 3000;
const POLLING_TIMEOUT_MS = 300000;

export function SelfieAnalyzer({ sessionId, className }: SelfieAnalyzerProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [isLikelyDesktop, setIsLikelyDesktop] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const router = useRouter();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      setIsLikelyDesktop(desktop);
      setStatus(desktop ? "desktop_qr" : "mobile_capture");
      console.log(`Device detected as: ${desktop ? "Desktop" : "Mobile"}`);
    } else {
      setStatus("mobile_capture");
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    pollIntervalRef.current = null;
    pollTimeoutRef.current = null;
    console.log("Polling stopped.");
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    console.log(`Starting polling for session: ${sessionId}`);

    const checkStatus = async () => {
      console.log(`Polling status for ${sessionId}...`);
      try {
        const response = await fetch(`/api/v1/analysis/${sessionId}/status`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status >= 400) {
            console.error(
              `Status check failed for ${sessionId}: ${response.status} ${response.statusText}`,
              data
            );
          } else {
            console.log(
              `Polling status for ${sessionId}: ${data.status || "unknown"}`
            );
            return;
          }
        }

        if (data.success) {
          console.log(`Received status: ${data.status}`);
          if (data.status === "awaiting_questionnaire") {
            stopPolling();
            setStatus("redirecting");
            toast.success("Selfie received! Moving to questionnaire...");
            router.push(`/analysis/session/${sessionId}/questionnaire`);
          } else if (
            data.status === "validation_failed" ||
            data.status === "analysis_failed"
          ) {
            stopPolling();
            setErrorMessage(
              data.message ||
                "Photo validation failed on the phone. Please scan the QR code again and try a different photo."
            );
            setStatus("validation_failed");
            toast.error(
              "Photo validation failed. Please scan the QR code again."
            );
          }
        } else {
          throw new Error(data.message || "Status check returned failure.");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    pollIntervalRef.current = setInterval(checkStatus, POLLING_INTERVAL_MS);
    pollTimeoutRef.current = setTimeout(() => {
      console.warn(
        `Polling timeout reached for session ${sessionId}. Stopping.`
      );
      stopPolling();
      setStatus((currentStatus) => {
        if (currentStatus === "desktop_qr") {
          setErrorMessage(
            "Timed out waiting for photo from phone. Please try scanning the QR code again."
          );
          toast.error("Timed out waiting for photo. Please try again.");
          return "polling_failed";
        }
        return currentStatus;
      });
    }, POLLING_TIMEOUT_MS);

    checkStatus();
  }, [sessionId, router, stopPolling]);

  useEffect(() => {
    if (status === "desktop_qr") {
      startPolling();
    }
    return () => {
      if (status !== "desktop_qr") {
        stopPolling();
      }
    };
  }, [status, startPolling, stopPolling]);

  const getQrCodeUrl = () => {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    if (!baseUrl) {
      console.error("Error: NEXT_PUBLIC_APP_URL is not set.");
      return "";
    }
    return `${baseUrl}/capture/${sessionId}`;
  };

  const handleMobileSuccess = useCallback(() => {
    setStatus("redirecting");
    toast.success("Selfie accepted! Moving to questionnaire...");
    router.push(`/analysis/session/${sessionId}/questionnaire`);
  }, [router, sessionId]);

  const handleMobileError = useCallback(
    (message: string) => {
      console.log("Mobile capture error reported to parent: ", message);
      if (isDevelopment && isLikelyDesktop) {
        setErrorMessage(
          message || "An error occurred during the mobile process."
        );
        setStatus("error");
        toast.error(message || "An error occurred.");
      }
    },
    [isDevelopment, isLikelyDesktop]
  );

  const handleDesktopFileUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Please select an image file first.");
      return;
    }
    if (isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    console.log(
      `Attempting to upload file via @vercel/blob for session ${sessionId}...`
    );

    const filename = `${sessionId}-dev-selfie-${Date.now()}.${
      selectedFile.name.split(".").pop() || "jpg"
    }`;
    let uploadedBlob: PutBlobResult | null = null;
    let validationSuccessful = false;

    try {
      toast.info("Uploading photo...");
      uploadedBlob = await upload(filename, selectedFile, {
        access: "public",
        handleUploadUrl: `/api/v1/blob/upload?sessionId=${sessionId}`,
      });

      if (!uploadedBlob?.url) {
        throw new Error("Blob upload failed: No URL returned.");
      }
      console.log("Upload successful:", uploadedBlob);
      toast.dismiss();
      toast.info("Validating photo...");

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

      validationSuccessful = true;
      console.log(`Validation successful for ${sessionId}, proceeding.`);
      handleMobileSuccess();
    } catch (error) {
      console.error(
        `Error during desktop file upload/validation for session ${sessionId}:`,
        error
      );
      const message =
        error instanceof Error
          ? error.message
          : "An unknown error occurred during processing.";
      setErrorMessage(`Upload/Validation Error: ${message}`);
      setStatus("validation_failed");
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
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [selectedFile, sessionId, isUploading, handleMobileSuccess]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        setSelectedFile(file as File);
      }
    },
    []
  );

  return (
    <div className={cn("space-y-4 flex flex-col items-center", className)}>
      {status === "idle" && !isUploading && (
        <div className="flex items-center space-x-2 text-muted-foreground p-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Determining best experience...</span>
        </div>
      )}

      {isLikelyDesktop && isDevelopment && status !== "redirecting" && (
        <div className="text-center space-y-4 p-6 border rounded-lg shadow-sm bg-card max-w-md w-full">
          {!isUploading &&
            (status === "desktop_qr" ||
              status === "idle" ||
              status === "validation_failed" ||
              status === "error" ||
              status === "polling_failed") && (
              <>
                <h3 className="text-lg font-medium">Dev Mode: Upload Selfie</h3>
                <p className="text-sm text-muted-foreground">
                  Select an image file from your computer to simulate the selfie
                  upload.
                </p>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/gif, image/webp"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="mr-2 h-4 w-4" /> Select Image File
                </Button>

                {selectedFile && !isUploading && (
                  <p className="text-sm text-muted-foreground truncate px-4">
                    Selected: {selectedFile.name}
                  </p>
                )}

                {selectedFile && (
                  <Button
                    onClick={handleDesktopFileUpload}
                    disabled={isUploading || !selectedFile}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Validate Image
                  </Button>
                )}
                {(status === "validation_failed" || status === "error") &&
                  errorMessage && (
                    <div className="text-sm text-destructive flex items-center justify-center gap-2 pt-2">
                      <AlertCircle className="h-4 w-4" />
                      {errorMessage}
                    </div>
                  )}
              </>
            )}

          {isUploading && (
            <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground w-full py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Processing Image...</span>
            </div>
          )}
        </div>
      )}

      {isLikelyDesktop && !isDevelopment && status == "desktop_qr" && (
        <div>
          <div className="bg-gradient-to-t from-[#DF6435] to-[#F48257] p-14 inline-block rounded-[1.5rem] shadow-season">
            <QRCode value={getQrCodeUrl()} size={200} level="M" />
          </div>
          <div className="flex items-center justify-center space-x-2 pt-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-orange" />
            <span className="subtitle">Waiting for image from phone...</span>
          </div>
        </div>
      )}

      {status === "mobile_capture" && !isLikelyDesktop && (
        <MobileCameraCapture
          sessionId={sessionId}
          onSuccess={handleMobileSuccess}
          onError={handleMobileError}
          context="primary"
        />
      )}

      {(status === "polling_failed" || status === "validation_failed") &&
        isLikelyDesktop && (
          <div className="text-center space-y-4 p-6 border border-destructive rounded-lg bg-destructive/10 max-w-md">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <h4 className="font-semibold text-destructive">Upload Failed</h4>
            <p className="text-sm text-destructive">
              {errorMessage || "An unexpected error occurred."}
            </p>
            {isDevelopment ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatus("desktop_qr");
                  setErrorMessage(null);
                  setSelectedFile(null);
                  setIsUploading(false);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Try Uploading Again
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setStatus("desktop_qr")}>
                Show QR Code Again
              </Button>
            )}
          </div>
        )}

      {status === "redirecting" && (
        <div className="flex items-center space-x-2 text-muted-foreground p-8">
          <Loader2 className="h-5 w-5 animate-spin text-orange" />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}
