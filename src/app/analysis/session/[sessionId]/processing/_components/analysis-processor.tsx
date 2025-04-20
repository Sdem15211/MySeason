"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react"; // Using lucide for loading spinner
import Link from "next/link"; // Import Link
import { Progress } from "@/components/ui/progress"; // <-- NEW: Import Progress

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
  // Include all possible statuses from schema.ts
  status:
    | "pending_payment"
    | "payment_complete"
    | "payment_failed"
    | "awaiting_selfie"
    | "selfie_validation_failed"
    | "awaiting_questionnaire"
    | "questionnaire_complete"
    | "analysis_pending"
    | "analysis_image_processing"
    | "analysis_feature_extraction"
    | "analysis_generating_insights"
    | "analysis_saving_results"
    | "analysis_cleaning_up"
    | "analysis_failed"
    | "analysis_complete"
    | "expired";
  analysisId?: string; // Only present when status is 'analysis_complete'
  message?: string;
  error?: string;
}

const POLLING_INTERVAL_MS = 3000; // Poll every 3 seconds
const MAX_POLLING_ATTEMPTS = 30; // Increase attempts slightly for more steps (30 * 3s = 90s)

// --- NEW: Map backend statuses to user-friendly messages ---
const statusMessages: Record<StatusResponse["status"], string> = {
  pending_payment: "Waiting for payment...", // Should ideally not be seen here
  payment_complete: "Payment complete, preparing analysis...", // Should ideally not be seen here
  payment_failed: "Payment failed.", // Should ideally not be seen here
  awaiting_selfie: "Waiting for selfie...", // Should ideally not be seen here
  selfie_validation_failed: "Selfie validation failed.", // Should ideally not be seen here
  awaiting_questionnaire: "Waiting for questionnaire...", // Should ideally not be seen here
  questionnaire_complete: "Initializing analysis...", // Initial status before 'start' POST completes
  analysis_pending: "Initializing analysis...", // Status after 'start' POST before first poll update
  analysis_image_processing: "Analyzing your image...",
  analysis_feature_extraction: "Extracting relevant values from your face...",
  analysis_generating_insights: "Generating your analysis...",
  analysis_saving_results: "Putting it all together...",
  analysis_cleaning_up: "Putting it all together...", // Keep same message for cleanup
  analysis_complete: "Analysis complete!",
  analysis_failed: "Analysis failed.",
  expired: "Session expired.", // Should ideally not be seen here
};
// --- END NEW ---

// --- NEW: Map backend statuses to progress percentages ---
const statusProgress: Record<StatusResponse["status"], number> = {
  pending_payment: 0,
  payment_complete: 0,
  payment_failed: 0,
  awaiting_selfie: 0,
  selfie_validation_failed: 0,
  awaiting_questionnaire: 0,
  questionnaire_complete: 5, // Start with a small value
  analysis_pending: 10,
  analysis_image_processing: 25,
  analysis_feature_extraction: 45,
  analysis_generating_insights: 70,
  analysis_saving_results: 90,
  analysis_cleaning_up: 95,
  analysis_complete: 100,
  analysis_failed: 0, // Reset on failure
  expired: 0,
};
// --- END NEW ---

export function AnalysisProcessor({ sessionId }: AnalysisProcessorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [progressMessage, setProgressMessage] = useState<string>(
    statusMessages["questionnaire_complete"]
  );
  const [progressValue, setProgressValue] = useState<number>(0); // <-- NEW state for progress
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
        setProgressMessage(statusMessages["analysis_pending"]);
        setProgressValue(statusProgress["analysis_pending"]); // <-- Set initial progress
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
          // Keep 'starting' status briefly, polling will update to 'processing' and set the first real message
          // setStatus("processing");
          setPollingAttempts(0); // Reset attempts for the polling useEffect
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "An unknown error occurred.";
          console.error(
            `ProcessingPage: Error starting analysis for ${sessionId}:`,
            err
          );
          setError(message);
          setStatus("failed");
          setProgressMessage(statusMessages["analysis_failed"]);
          setProgressValue(statusProgress["analysis_failed"]); // <-- Reset progress on start failure
          toast.error(`Error: ${message}`);
        }
      };

      startAnalysis();
    }
    // Dependencies only include sessionId and status. The checks inside the effect handle preventing multiple API calls.
  }, [sessionId, status]);

  useEffect(() => {
    // Poll for status if starting or processing
    if (status !== "starting" && status !== "processing") return; // <-- Allow polling right after starting

    if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
      console.error(
        `ProcessingPage: Max polling attempts reached for session ${sessionId}.`
      );
      setError(
        "Analysis is taking longer than expected. Please check back later or contact support."
      );
      setStatus("failed");
      setProgressMessage("Analysis timed out.");
      setProgressValue(0); // <-- Reset progress on timeout
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

        const backendStatus = result.status;
        console.log(
          `ProcessingPage: Received status for ${sessionId}: ${backendStatus}`
        );

        // Update progress message and value based on backend status
        setProgressMessage(statusMessages[backendStatus] || "Processing...");
        setProgressValue(
          // <-- Update progress value
          statusProgress[backendStatus] !== undefined
            ? statusProgress[backendStatus]
            : progressValue // Keep current value if status unknown
        );

        // --- UPDATED Status Handling ---
        if (backendStatus === "analysis_complete") {
          setStatus("complete");
          toast.success("Analysis complete! Redirecting...");
          if (result.analysisId) {
            // Short delay before redirect to allow user to see "complete" message
            setTimeout(() => {
              router.push(`/analysis/result/${result.analysisId}`);
            }, 1000); // 1 second delay
          } else {
            console.error(
              `ProcessingPage: Analysis complete for ${sessionId} but analysisId is missing.`
            );
            setError("Analysis complete, but could not find the result ID.");
            setStatus("failed");
            toast.error("Failed to retrieve analysis result ID.");
          }
          clearInterval(intervalId); // Stop polling on completion
        } else if (backendStatus === "analysis_failed") {
          setError(result.message || "Analysis process failed.");
          setStatus("failed");
          toast.error(result.message || "Analysis failed.");
          clearInterval(intervalId); // Stop polling on failure
        } else if (
          [
            // List of valid "in-progress" statuses
            "analysis_pending",
            "analysis_image_processing",
            "analysis_feature_extraction",
            "analysis_generating_insights",
            "analysis_saving_results",
            "analysis_cleaning_up",
            "questionnaire_complete", // Include this as it might be the initial state before the first real update
          ].includes(backendStatus)
        ) {
          // If it's a valid processing state, ensure the main status is 'processing'
          if (status === "starting") {
            setStatus("processing"); // Transition from 'starting' to 'processing' on first successful poll
          }
          // Continue polling...
        } else {
          // If status is unexpected (e.g., back to awaiting_selfie, expired), treat as error
          console.error(
            `ProcessingPage: Unexpected status polling result for ${sessionId}: ${backendStatus}`
          );
          setError(`Unexpected status received: ${backendStatus}`);
          setStatus("failed");
          toast.error("Unexpected analysis status.");
          clearInterval(intervalId); // Stop polling on unexpected status
        }
        // --- END UPDATED Status Handling ---
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        console.error(
          `ProcessingPage: Error polling status for ${sessionId}:`,
          err
        );
        // Don't immediately fail on a single polling error, maybe retry?
        // For simplicity now, we still fail. Consider adding retry logic later if needed.
        setError(message);
        setStatus("failed");
        setProgressMessage("Error checking status.");
        setProgressValue(statusProgress["analysis_failed"]); // <-- Reset progress on poll error
        toast.error(`Error checking status: ${message}`);
        clearInterval(intervalId); // Stop polling on error
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
    // Ensure status is included in dependencies to restart polling if status changes back to processing (though unlikely)
  }, [status, sessionId, router, pollingAttempts]);

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-md">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      {/* Display the dynamic progress message */}
      <p className="text-center h-10">{progressMessage}</p>{" "}
      {/* Added fixed height */}
      {/* --- NEW: Progress Bar --- */}
      <Progress value={progressValue} className="w-full" />
      {/* --- END NEW --- */}
      {/* Remove redundant status-specific paragraphs */}
      {/* {status === "starting" && <p>Initializing analysis...</p>} */}
      {/* {status === "processing" && (
        <p>
          Analyzing... Attempt {pollingAttempts} of {MAX_POLLING_ATTEMPTS}
        </p>
      )} */}
      {/* {status === "complete" && (
        <p className="text-green-600">Analysis complete! Redirecting...</p>
      )} */}
      {/* Keep error display */}
      {status === "failed" && (
        <div className="text-destructive space-y-2 text-center mt-4">
          <p className="font-semibold">An error occurred:</p>
          <p>{error || "Unknown error"}</p>
          {/* Use Link component for internal navigation */}
          <Link
            href="/"
            className="inline-block text-sm text-blue-600 underline hover:text-blue-800 mt-2"
          >
            Return Home
          </Link>
        </div>
      )}
    </div>
  );
}
