"use client";

import { useState, ChangeEvent } from "react";
import { upload } from "@vercel/blob/client";
import type { UploadProgressEvent } from "@vercel/blob";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SelfieAnalyzerProps {
  sessionId: string;
  className?: string;
}

type Status =
  | "idle"
  | "selecting"
  | "uploading"
  | "validating"
  | "redirecting"
  | "success"
  | "error";

export function SelfieAnalyzer({ sessionId, className }: SelfieAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file) {
        setFile(file);
        setStatus("selecting");
        setErrorMessage(null);
      }
    } else {
      setFile(null);
      setStatus("idle");
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setErrorMessage("Please select a file first.");
      toast.error("Please select a file first.");
      return;
    }

    setStatus("uploading");
    setErrorMessage(null);
    let blobResult = null;

    console.log(`Starting upload process for session: ${sessionId}`);

    try {
      // 1. Upload to Vercel Blob
      const filename = `${sessionId}-${file.name}`;
      console.log(`Uploading file as: ${filename}`);

      blobResult = await upload(filename, file, {
        access: "public",
        handleUploadUrl: `/api/v1/blob/upload?sessionId=${sessionId}`,
        onUploadProgress: (progressEvent: UploadProgressEvent) => {
          setUploadProgress(progressEvent.percentage);
          console.log("Upload Progress:", progressEvent.percentage);
        },
      });

      console.log("Upload complete:", blobResult);
      setUploadProgress(100);

      if (!blobResult?.url) {
        throw new Error("Blob upload failed or result is missing URL.");
      }

      // 2. Validate the Uploaded Image
      setStatus("validating");
      console.log("Sending request to /api/v1/analysis/validate");
      const validateResponse = await fetch("/api/v1/analysis/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: blobResult.url, sessionId }),
      });

      const validateData = await validateResponse.json();
      console.log("Validation response:", validateData);

      if (!validateResponse.ok || !validateData.success) {
        throw new Error(
          validateData.message ||
            "Image validation failed. Please try a different photo."
        );
      }

      console.log("Validation successful. Redirecting to questionnaire...");
      setStatus("redirecting");
      toast.success("Selfie accepted! Moving to questionnaire...");

      router.push(`/analysis/session/${sessionId}/questionnaire`);
    } catch (error: unknown) {
      console.error("Error during selfie processing:", error);
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      setErrorMessage(message);
      setStatus("error");
      toast.error(message);

      if (status !== "uploading" && blobResult?.url) {
        console.log(
          `Attempting to delete blob due to subsequent error: ${blobResult.url}`
        );
        try {
          fetch("/api/v1/blob/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blobUrl: blobResult.url, sessionId }),
          });
        } catch (deleteError) {
          console.error("Failed to send delete request for blob:", deleteError);
        }
      }
    }
  };

  const isLoading = ["uploading", "validating", "redirecting"].includes(status);

  return (
    <div className={cn("space-y-4", className)}>
      <Input
        type="file"
        accept="image/jpeg, image/png, image/webp"
        onChange={handleFileChange}
        disabled={isLoading}
        className="max-w-sm"
      />
      {status === "uploading" && (
        <div className="w-full max-w-sm bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-150"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
      <Button onClick={handleSubmit} disabled={!file || isLoading}>
        {isLoading
          ? status === "uploading"
            ? `Uploading (${uploadProgress.toFixed(0)}%)...`
            : status === "validating"
            ? "Validating..."
            : status === "redirecting"
            ? "Redirecting..."
            : "Processing..."
          : "Upload Selfie"}
      </Button>
      {status === "error" && errorMessage && (
        <p className="text-red-600">Error: {errorMessage}</p>
      )}
    </div>
  );
}
