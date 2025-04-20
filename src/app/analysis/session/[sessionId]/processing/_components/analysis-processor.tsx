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
    | "analysis_failed"
    | "analysis_complete"
    | "expired";
  analysisId?: string; // Only present when status is 'analysis_complete'
  message?: string;
  error?: string;
}

const POLLING_INTERVAL_MS = 3000; // Poll every 3 seconds
const MAX_POLLING_ATTEMPTS = 30; // Increase attempts slightly for more steps (30 * 3s = 90s)

// --- NEW: Define Mock Messages & Timings ---
const mockProgressSteps = [
  { message: "Analyzing your image...", duration: 2000 }, // 2 seconds
  {
    message: "Extracting relevant values from your face...",
    duration: 2500,
  }, // 2.5 seconds
  { message: "Generating your analysis...", duration: 7000 }, // 7 seconds
  { message: "Putting it all together...", duration: 3000 }, // 3 seconds
];
// --- END NEW ---

export function AnalysisProcessor({ sessionId }: AnalysisProcessorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [progressMessage, setProgressMessage] = useState<string>(
    "Initializing analysis..." // Initial message
  );
  const hasStartedAnalysis = useRef(false);
  const mockProgressTimeouts = useRef<NodeJS.Timeout[]>([]); // Ref to hold timeout IDs

  // --- Effect to start analysis POST and Mock Progress Sequence ---
  useEffect(() => {
    if (hasStartedAnalysis.current || status !== "idle") {
      return;
    }
    hasStartedAnalysis.current = true;
    setStatus("starting"); // Indicate the overall process has begun
    setError(null);
    setProgressMessage("Initializing analysis..."); // Set initial message

    console.log(
      `ProcessingPage: Triggering analysis for session ${sessionId}...`
    );

    // --- Start Mock Progress Timers ---
    let cumulativeDelay = 0;
    mockProgressSteps.forEach((step) => {
      cumulativeDelay += step.duration;
      const timeoutId = setTimeout(() => {
        // Only update if still in a processing state
        setStatus((currentStatus) => {
          if (currentStatus === "processing" || currentStatus === "starting") {
            setProgressMessage(step.message);
            return currentStatus; // Keep status as processing/starting
          }
          return currentStatus; // Don't change status if complete/failed
        });
      }, cumulativeDelay);
      mockProgressTimeouts.current.push(timeoutId);
    });
    // --- End Mock Progress Timers ---

    // --- Initiate Backend Analysis (Runs in parallel to mock progress) ---
    const startAnalysisApiCall = async () => {
      try {
        const response = await fetch(`/api/v1/analysis/${sessionId}/start`, {
          method: "POST",
        });
        const result: StartResponse = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              result.error ||
              "Failed to start analysis process."
          );
        }

        console.log(
          `ProcessingPage: Analysis POST request successful for session ${sessionId}. Polling will determine completion.`
        );
        // Transition to processing status, indicating polling should be active
        setStatus("processing");

        // NOTE: We don't wait for this POST to finish before showing mock progress.
        // The actual completion is determined by the polling mechanism below.
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        console.error(
          `ProcessingPage: Error starting analysis POST for ${sessionId}:`,
          err
        );
        setError(message);
        setStatus("failed");
        setProgressMessage("Error initiating analysis."); // Update message on failure
        toast.error(`Error: ${message}`);
        // Clear any pending mock timeouts if the start call fails
        mockProgressTimeouts.current.forEach(clearTimeout);
        mockProgressTimeouts.current = [];
      }
    };

    startAnalysisApiCall();

    // --- Cleanup function for timeouts on unmount ---
    return () => {
      mockProgressTimeouts.current.forEach(clearTimeout);
      mockProgressTimeouts.current = [];
    };
  }, [sessionId, status]); // status dependency is okay here

  // --- Effect for Polling FINAL Status (Complete/Failed) ---
  useEffect(() => {
    // Only poll if the backend process has potentially started and we are waiting
    if (status !== "processing") return;

    if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
      console.error(
        `ProcessingPage: Max polling attempts reached for session ${sessionId}.`
      );
      setError(
        "Analysis is taking longer than expected. Please check back later or contact support."
      );
      setStatus("failed");
      setProgressMessage("Analysis timed out.");
      toast.error("Analysis timed out.");
      // Clear mock timeouts if polling times out
      mockProgressTimeouts.current.forEach(clearTimeout);
      mockProgressTimeouts.current = [];
      return;
    }

    const intervalId = setInterval(async () => {
      console.log(
        `ProcessingPage: Polling FINAL status for session ${sessionId}... Attempt ${
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
          `ProcessingPage: Received FINAL status check for ${sessionId}: ${backendStatus}`
        );

        // --- Simplified Status Handling for Polling ---
        if (backendStatus === "analysis_complete") {
          // Clear any remaining mock timeouts
          mockProgressTimeouts.current.forEach(clearTimeout);
          mockProgressTimeouts.current = [];

          setStatus("complete");
          setProgressMessage("Analysis complete!"); // Set final message
          toast.success("Analysis complete! Redirecting...");

          if (result.analysisId) {
            setTimeout(() => {
              router.push(`/analysis/result/${result.analysisId}`);
            }, 1000);
          } else {
            console.error(
              `ProcessingPage: Analysis complete for ${sessionId} but analysisId is missing.`
            );
            setError("Analysis complete, but could not find the result ID.");
            setStatus("failed");
            setProgressMessage("Error retrieving results.");
            toast.error("Failed to retrieve analysis result ID.");
          }
          clearInterval(intervalId); // Stop polling
        } else if (backendStatus === "analysis_failed") {
          // Clear any remaining mock timeouts
          mockProgressTimeouts.current.forEach(clearTimeout);
          mockProgressTimeouts.current = [];

          setError(result.message || "Analysis process failed.");
          setStatus("failed");
          setProgressMessage(
            result.message || "Analysis failed. Please try again."
          );
          toast.error(result.message || "Analysis failed.");
          clearInterval(intervalId); // Stop polling
        } else {
          // Backend is still working (e.g., analysis_pending)
          // Do nothing, let the mock progress messages continue or finish
          // Polling loop continues...
          console.log(
            `   - Backend status is ${backendStatus}, continuing poll.`
          );
        }
        // --- End Simplified Status Handling ---
      } catch (err) {
        // Clear any remaining mock timeouts
        mockProgressTimeouts.current.forEach(clearTimeout);
        mockProgressTimeouts.current = [];

        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        console.error(
          `ProcessingPage: Error polling status for ${sessionId}:`,
          err
        );
        setError(message);
        setStatus("failed");
        setProgressMessage("Error checking status.");
        toast.error(`Error checking status: ${message}`);
        clearInterval(intervalId);
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [status, sessionId, router, pollingAttempts]);

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-md">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      {/* Display the dynamic progress message */}
      <p className="text-center h-10">{progressMessage}</p>{" "}
      {/* Added fixed height */}
    </div>
  );
}
