"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

interface AnalysisProcessorProps {
  sessionId: string;
}

type ProcessingStatus =
  | "idle"
  | "starting"
  | "processing"
  | "complete"
  | "failed";

interface StartResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface StatusResponse {
  success: boolean;
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
  analysisId?: string;
  message?: string;
  error?: string;
}

const POLLING_INTERVAL_MS = 3000;
const MAX_POLLING_ATTEMPTS = 30;

const mockProgressSteps = [
  { message: "Processing your image... 📸", duration: 2000 },
  {
    message: "Extracting relevant values from your face... 🤩",
    duration: 3000,
  },
  { message: "Generating your analysis... 🧠", duration: 4000 },
  { message: "Putting it all together... 📝", duration: 7000 },
];

export function AnalysisProcessor({ sessionId }: AnalysisProcessorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [progressMessage, setProgressMessage] = useState<string>(
    "Initializing analysis..."
  );
  const hasStartedAnalysis = useRef(false);
  const mockProgressTimeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (hasStartedAnalysis.current) return;
    hasStartedAnalysis.current = true;

    setStatus("starting");
    setError(null);
    setProgressMessage("Initializing analysis...");

    console.log(
      `ProcessingPage: Starting analysis process for session ${sessionId}...`
    );

    // --- Start Mock Progress Timers ---
    mockProgressTimeouts.current = [];
    let cumulativeDelay = 0;
    mockProgressSteps.forEach((step) => {
      cumulativeDelay += step.duration;
      const timeoutId = setTimeout(() => {
        setStatus((currentStatus) => {
          if (currentStatus === "starting" || currentStatus === "processing") {
            setProgressMessage(step.message);
          }
          return currentStatus;
        });
      }, cumulativeDelay);
      mockProgressTimeouts.current.push(timeoutId);
    });
    // --- End Mock Progress Timers ---

    // --- Initiate Backend Analysis ---
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
          `   - POST successful. Transitioning to processing status.`
        );
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
        setStatus("failed");
        setProgressMessage("Error initiating analysis.");
        toast.error(`Error: ${message}`);
        mockProgressTimeouts.current.forEach(clearTimeout);
        mockProgressTimeouts.current = [];
      }
    };

    startAnalysisApiCall();

    // Cleanup timeouts on unmount
    return () => {
      mockProgressTimeouts.current.forEach(clearTimeout);
      mockProgressTimeouts.current = [];
      hasStartedAnalysis.current = false;
    };
  }, [sessionId]);

  // --- Effect for Polling FINAL Status (Complete/Failed) ---
  useEffect(() => {
    if (status !== "processing") {
      return;
    }

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
      mockProgressTimeouts.current.forEach(clearTimeout);
      mockProgressTimeouts.current = [];
      return;
    }

    console.log(
      `ProcessingPage: Setting up polling interval for ${sessionId}. Attempt ${
        pollingAttempts + 1
      }`
    );

    const intervalId = setInterval(async () => {
      setPollingAttempts((prev) => prev + 1);
      if (pollingAttempts + 1 > MAX_POLLING_ATTEMPTS) {
        console.warn(
          `Polling interval check: Max attempts (${MAX_POLLING_ATTEMPTS}) reached for ${sessionId}. Stopping poll.`
        );
        clearInterval(intervalId);
        return;
      }

      console.log(
        `ProcessingPage: Polling FINAL status for session ${sessionId}... Attempt ${
          pollingAttempts + 1
        }`
      );

      try {
        const response = await fetch(`/api/v1/analysis/${sessionId}/status`);
        const result: StatusResponse = await response.json();

        let shouldProcessResult = true;
        setStatus((currentState) => {
          if (currentState !== "processing") {
            shouldProcessResult = false;
          }
          return currentState;
        });

        if (!shouldProcessResult) {
          console.log(
            `   - Status changed during fetch for ${sessionId}. Aborting result processing.`
          );
          clearInterval(intervalId);
          return;
        }

        if (!response.ok || !result.success) {
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

          if (backendStatus === "analysis_complete") {
            console.log(
              `   - Status is complete. Clearing timeouts and stopping poll.`
            );
            mockProgressTimeouts.current.forEach(clearTimeout);
            mockProgressTimeouts.current = [];
            setStatus("complete");
            setProgressMessage("Analysis complete!");

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
            // No need to clear interval here, effect cleanup handles it when status changes
          } else if (backendStatus === "analysis_failed") {
            console.log(
              `   - Status is failed. Clearing timeouts and stopping poll.`
            );
            mockProgressTimeouts.current.forEach(clearTimeout);
            mockProgressTimeouts.current = [];
            setError(result.message || "Analysis process failed.");
            setStatus("failed");
            setProgressMessage(
              result.message || "Analysis failed. Please try again."
            );
            toast.error(result.message || "Analysis failed.");
          } else {
            // Backend is still working (e.g., analysis_pending)
            console.log(
              `   - Backend status is ${backendStatus}, continuing poll.`
            );
            // Polling continues...
          }
        }
      } catch (err) {
        console.error(
          `ProcessingPage: Error during polling fetch for ${sessionId}:`,
          err
        );
        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
        setStatus("failed");
        setProgressMessage("Error checking status.");
        toast.error(`Error checking status: ${message}`);
        mockProgressTimeouts.current.forEach(clearTimeout);
        mockProgressTimeouts.current = [];
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      console.log(
        `Clearing polling interval for ${sessionId}. Current status: ${status}`
      );
      clearInterval(intervalId);
    };
  }, [status, sessionId, router, pollingAttempts]);

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      {progressMessage === "Analysis complete!" ? (
        <>
          <Check className="h-12 w-12 text-orange" />
          <p className="text-center h-10 title">{progressMessage}</p>
          <p className="subtitle">Moving on to questionnaire...</p>
        </>
      ) : (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-orange" />
          <p className="text-center h-10 title">{progressMessage}</p>{" "}
          {status === "failed" && error && (
            <p className="text-sm text-red-600 dark:text-red-500 mt-2 text-center">
              {error}
              {/* TODO: Add a retry or contact support link here */}
            </p>
          )}
        </>
      )}
    </div>
  );
}
