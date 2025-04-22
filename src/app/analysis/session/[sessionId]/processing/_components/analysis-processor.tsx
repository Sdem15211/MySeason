"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react"; // Using lucide for loading spinner

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

// --- Define Mock Messages & Timings ---
const mockProgressSteps = [
  { message: "Analyzing your image...", duration: 2000 }, // 2 seconds
  {
    message: "Extracting relevant values from your face...",
    duration: 2500,
  }, // 2.5 seconds
  { message: "Generating your analysis...", duration: 7000 }, // 7 seconds
  { message: "Putting it all together...", duration: 3000 }, // 3 seconds
];

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
    // Ensure this effect runs only once per session ID load initially
    if (hasStartedAnalysis.current) return;
    hasStartedAnalysis.current = true;

    setStatus("starting");
    setError(null);
    setProgressMessage("Initializing analysis...");

    console.log(
      `ProcessingPage: Starting analysis process for session ${sessionId}...`
    );

    // --- Start Mock Progress Timers ---
    mockProgressTimeouts.current = []; // Clear any previous timeouts (safety)
    let cumulativeDelay = 0;
    mockProgressSteps.forEach((step) => {
      cumulativeDelay += step.duration;
      const timeoutId = setTimeout(() => {
        // Use a state check inside the timeout to avoid setting message after completion/failure
        setStatus((currentStatus) => {
          // Only update message if process is still in a preliminary state
          if (currentStatus === "starting" || currentStatus === "processing") {
            setProgressMessage(step.message);
          }
          // Don't change the status itself here; polling or API failure will do that
          return currentStatus;
        });
      }, cumulativeDelay);
      mockProgressTimeouts.current.push(timeoutId);
    });
    // --- End Mock Progress Timers ---

    // --- Initiate Backend Analysis ---
    const startAnalysisApiCall = async () => {
      try {
        console.log(`   - Sending POST /api/v1/analysis/${sessionId}/start`);
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
          `   - POST successful. Transitioning to processing status.`
        );
        // Transition to processing status *after* successful POST.
        // This triggers the polling useEffect.
        setStatus((currentStatus) =>
          currentStatus === "starting" ? "processing" : currentStatus
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        console.error(
          `ProcessingPage: Error in startAnalysisApiCall for ${sessionId}:`,
          err
        );
        setError(message);
        setStatus("failed"); // Set final failed status
        setProgressMessage("Error initiating analysis."); // Set error message
        toast.error(`Error: ${message}`);
        // Clear mock timeouts on initial POST failure
        mockProgressTimeouts.current.forEach(clearTimeout);
        mockProgressTimeouts.current = [];
      }
    };

    startAnalysisApiCall();

    // Cleanup timeouts on unmount
    return () => {
      console.log(
        `AnalysisProcessor unmounting or sessionId changing (${sessionId}), clearing timeouts.`
      );
      mockProgressTimeouts.current.forEach(clearTimeout);
      mockProgressTimeouts.current = [];
      // Reset ref if sessionId changes causing re-run
      hasStartedAnalysis.current = false;
    };
    // Run only when sessionId changes
  }, [sessionId]);

  // --- Effect for Polling FINAL Status (Complete/Failed) ---
  useEffect(() => {
    // Only poll if the status is 'processing'
    if (status !== "processing") {
      // Stop polling if status changes from 'processing' (e.g., to complete/failed)
      return;
    }

    // Check for max attempts before setting interval
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
      return; // Exit effect, interval won't be set
    }

    console.log(
      `ProcessingPage: Setting up polling interval for ${sessionId}. Attempt ${
        pollingAttempts + 1
      }`
    );

    const intervalId = setInterval(async () => {
      // Increment attempts inside the interval callback before the async operation
      // This ensures we track attempts even if the component re-renders during the fetch
      setPollingAttempts((prev) => prev + 1);

      // Check attempts again *inside* the interval using the latest state value
      // This is a safety check in case the state update wasn't immediate
      if (pollingAttempts + 1 > MAX_POLLING_ATTEMPTS) {
        console.warn(
          `Polling interval check: Max attempts (${MAX_POLLING_ATTEMPTS}) reached for ${sessionId}. Stopping poll.`
        );
        // Status will be set to failed by the outer check in the next effect run.
        // No need to set status here, just clear interval.
        clearInterval(intervalId);
        return;
      }

      console.log(
        `ProcessingPage: Polling FINAL status for session ${sessionId}... Attempt ${
          pollingAttempts + 1 // Use updated count for logging
        }`
      );

      try {
        const response = await fetch(`/api/v1/analysis/${sessionId}/status`);
        const result: StatusResponse = await response.json();

        // Check status immediately after fetch completes to see if we should still process it
        let shouldProcessResult = true;
        setStatus((currentState) => {
          if (currentState !== "processing") {
            shouldProcessResult = false; // Status changed while fetch was in flight
          }
          return currentState;
        });

        if (!shouldProcessResult) {
          console.log(
            `   - Status changed during fetch for ${sessionId}. Aborting result processing.`
          );
          clearInterval(intervalId); // Stop this interval
          return;
        }

        if (!response.ok || !result.success) {
          // Handle specific errors like session not found
          if (response.status === 404 && result.error === "SESSION_NOT_FOUND") {
            console.warn(
              `Polling: Session ${sessionId} not found. Assuming failure/expiry.`
            );
            setError(
              "Analysis session could not be found. It might have expired."
            );
            setStatus("failed");
            setProgressMessage("Session not found.");
            toast.error("Analysis session not found.");
          } else {
            throw new Error(
              result.message || result.error || "Failed to get analysis status."
            );
          }
        } else {
          const backendStatus = result.status;
          console.log(
            `ProcessingPage: Received FINAL status check for ${sessionId}: ${backendStatus}`
          );

          // Check final states
          if (backendStatus === "analysis_complete") {
            console.log(
              `   - Status is complete. Clearing timeouts and stopping poll.`
            );
            mockProgressTimeouts.current.forEach(clearTimeout);
            mockProgressTimeouts.current = [];
            setStatus("complete"); // This will trigger effect cleanup
            setProgressMessage("Analysis complete!");
            toast.success("Analysis complete! Redirecting...");

            if (result.analysisId) {
              setTimeout(() => {
                router.push(`/analysis/result/${result.analysisId}`);
              }, 1000); // Keep redirect delay
            } else {
              console.error(
                `ProcessingPage: Analysis complete for ${sessionId} but analysisId is missing.`
              );
              setError("Analysis complete, but could not find the result ID.");
              setStatus("failed"); // Treat as failure if ID is missing
              setProgressMessage("Error retrieving results.");
              toast.error("Failed to retrieve analysis result ID.");
            }
            // No need to clear interval here, effect cleanup handles it when status changes
          } else if (backendStatus === "analysis_failed") {
            console.log(
              `   - Status is failed. Clearing timeouts and stopping poll.`
            );
            mockProgressTimeouts.current.forEach(clearTimeout);
            mockProgressTimeouts.current = [];
            setError(result.message || "Analysis process failed.");
            setStatus("failed"); // This will trigger effect cleanup
            setProgressMessage(
              result.message || "Analysis failed. Please try again."
            );
            toast.error(result.message || "Analysis failed.");
            // No need to clear interval here, effect cleanup handles it
          } else {
            // Backend is still working (e.g., analysis_pending)
            console.log(
              `   - Backend status is ${backendStatus}, continuing poll.`
            );
            // Polling continues...
          }
        }
      } catch (err) {
        // Error during polling fetch/processing
        console.error(
          `ProcessingPage: Error during polling fetch for ${sessionId}:`,
          err
        );
        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
        setStatus("failed"); // This will trigger effect cleanup
        setProgressMessage("Error checking status.");
        toast.error(`Error checking status: ${message}`);
        // Clear mock timeouts on polling error
        mockProgressTimeouts.current.forEach(clearTimeout);
        mockProgressTimeouts.current = [];
        // No need to clear interval here, effect cleanup handles it
      }
    }, POLLING_INTERVAL_MS);

    // Cleanup function for *this* effect instance
    return () => {
      console.log(
        `Clearing polling interval for ${sessionId}. Current status: ${status}`
      );
      clearInterval(intervalId);
    };
    // Re-run effect if status changes (to start/stop polling)
    // or pollingAttempts changes (to re-evaluate max attempts at the start)
  }, [status, sessionId, router, pollingAttempts]);

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-md">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      {/* Display the dynamic progress message */}
      <p className="text-center h-10">{progressMessage}</p>{" "}
      {/* Kept fixed height */}
      {/* Optional: Display error message if needed */}
      {status === "failed" && error && (
        <p className="text-sm text-red-600 dark:text-red-500 mt-2 text-center">
          {error}
          {/* Consider adding a retry or contact support link here */}
          {/* <Link href="/support" className="underline ml-1">Contact Support</Link> */}
        </p>
      )}
    </div>
  );
}
