"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react"; // Using lucide for loading spinner
import Link from "next/link"; // Import Link

interface AnalysisProcessorProps {
  sessionId: string;
}

type ProcessingStatus =
  | "idle"
  | "starting"
  | "processing"
  | "complete"
  | "failed";

// Define expected response types (adjust based on actual API responses)
interface StartResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface StatusResponse {
  success: boolean;
  status: string; // e.g., 'questionnaire_complete', 'analysis_pending', 'analysis_running', 'analysis_complete', 'analysis_failed'
  analysisId?: string; // Only present when status is 'analysis_complete'
  message?: string;
  error?: string;
}

const POLLING_INTERVAL_MS = 3000; // Poll every 3 seconds
const MAX_POLLING_ATTEMPTS = 20; // Stop polling after 1 minute (20 * 3s)

export function AnalysisProcessor({ sessionId }: AnalysisProcessorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const hasStartedAnalysis = useRef(false); // Ref to track if start was initiated

  useEffect(() => {
    // Trigger the analysis immediately on component mount, only once.
    // Use the ref to ensure it doesn't run again due to StrictMode or re-renders
    if (hasStartedAnalysis.current) {
      return;
    }
    // Only run if status is idle (initial state)
    if (status === "idle") {
      hasStartedAnalysis.current = true; // Mark as started

      const startAnalysis = async () => {
        setStatus("starting");
        setError(null);
        console.log(
          `ProcessingPage: Triggering analysis for session ${sessionId}...`
        );

        try {
          const response = await fetch(`/api/v1/analysis/${sessionId}/start`, {
            method: "POST",
          });

          const result: StartResponse = await response.json();

          if (!response.ok || !result.success) {
            // Use detailed error from API if available
            throw new Error(
              result.message ||
                result.error ||
                "Failed to start analysis process."
            );
          }

          console.log(
            `ProcessingPage: Analysis started for session ${sessionId}. Begin polling.`
          );
          setStatus("processing");
          setPollingAttempts(0);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "An unknown error occurred.";
          console.error(
            `ProcessingPage: Error starting analysis for ${sessionId}:`,
            err
          );
          setError(message);
          setStatus("failed");
          toast.error(`Error: ${message}`);
        }
      };

      startAnalysis();
    }
    // Dependencies only include sessionId and status. The checks inside the effect handle preventing multiple API calls.
  }, [sessionId, status]);

  useEffect(() => {
    // Poll for status if processing
    if (status !== "processing") return;

    if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
      console.error(
        `ProcessingPage: Max polling attempts reached for session ${sessionId}.`
      );
      setError(
        "Analysis is taking longer than expected. Please check back later or contact support."
      );
      setStatus("failed");
      toast.error("Analysis timed out.");
      return;
    }

    const intervalId = setInterval(async () => {
      console.log(
        `ProcessingPage: Polling status for session ${sessionId}... Attempt ${
          pollingAttempts + 1
        }`
      );
      setPollingAttempts((prev) => prev + 1);

      try {
        const response = await fetch(`/api/v1/analysis/${sessionId}/status`);
        const result: StatusResponse = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || result.error || "Failed to get analysis status."
          );
        }

        console.log(
          `ProcessingPage: Received status for ${sessionId}: ${result.status}`
        );

        if (result.status === "analysis_complete") {
          setStatus("complete");
          toast.success("Analysis complete! Redirecting...");
          if (result.analysisId) {
            router.push(`/analysis/result/${result.analysisId}`);
          } else {
            console.error(
              `ProcessingPage: Analysis complete for ${sessionId} but analysisId is missing.`
            );
            setError("Analysis complete, but could not find the result ID.");
            setStatus("failed");
            toast.error("Failed to retrieve analysis result ID.");
          }
        } else if (result.status === "analysis_failed") {
          setError(result.message || "Analysis process failed.");
          setStatus("failed");
          toast.error(result.message || "Analysis failed.");
        } else if (
          ![
            "analysis_pending",
            "analysis_running",
            "questionnaire_complete",
          ].includes(result.status)
        ) {
          // If status is unexpected (e.g., back to awaiting_selfie), treat as error
          console.error(
            `ProcessingPage: Unexpected status polling result for ${sessionId}: ${result.status}`
          );
          setError(`Unexpected status received: ${result.status}`);
          setStatus("failed");
          toast.error("Unexpected analysis status.");
        }
        // If status is pending/running, do nothing - loop continues
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        console.error(
          `ProcessingPage: Error polling status for ${sessionId}:`,
          err
        );
        setError(message);
        setStatus("failed");
        toast.error(`Error checking status: ${message}`);
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [status, sessionId, router, pollingAttempts]); // Keep dependencies for polling effect

  return (
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      {status === "starting" && <p>Initializing analysis...</p>}
      {status === "processing" && (
        <p>
          Analyzing... Attempt {pollingAttempts} of {MAX_POLLING_ATTEMPTS}
        </p>
      )}
      {status === "complete" && (
        <p className="text-green-600">Analysis complete! Redirecting...</p>
      )}
      {status === "failed" && (
        <div className="text-red-600 space-y-2 text-center">
          <p className="font-semibold">An error occurred during analysis:</p>
          <p>{error || "Unknown error"}</p>
          {/* Use Link component for internal navigation */}
          <Link href="/" className="text-blue-600 underline">
            Return Home
          </Link>
        </div>
      )}
    </div>
  );
}
