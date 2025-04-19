"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { MobileCameraCapture } from "./mobile-camera-capture";

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

  const router = useRouter();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
          throw new Error(
            data.message || `Status check failed: ${response.statusText}`
          );
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

  const handleMobileError = useCallback((message: string) => {
    console.log("Mobile capture error reported to parent: ", message);
  }, []);

  return (
    <div className={cn("space-y-4 flex flex-col items-center", className)}>
      {status === "idle" && (
        <div className="flex items-center space-x-2 text-muted-foreground p-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Determining best experience...</span>
        </div>
      )}

      {status === "desktop_qr" && isLikelyDesktop && (
        <div className="text-center space-y-4 p-6 border rounded-lg shadow-sm bg-card max-w-md">
          <h3 className="text-lg font-medium">Scan with your Phone</h3>
          <p className="text-sm text-muted-foreground">
            Use your phone&apos;s camera for the best quality selfie. Scan the
            QR code below to continue on your mobile device.
          </p>
          <div className="bg-white p-4 inline-block rounded-md shadow">
            <QRCode value={getQrCodeUrl()} size={192} level="M" />
          </div>
          <div className="flex items-center justify-center space-x-2 pt-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Waiting for photo from phone...</span>
          </div>
        </div>
      )}

      {status === "mobile_capture" && !isLikelyDesktop && (
        <MobileCameraCapture
          sessionId={sessionId}
          onSuccess={handleMobileSuccess}
          onError={handleMobileError}
        />
      )}

      {(status === "polling_failed" || status === "validation_failed") &&
        isLikelyDesktop && (
          <div className="text-center space-y-4 p-6 border border-destructive rounded-lg bg-destructive/10 max-w-md">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <h4 className="font-semibold text-destructive">Upload Failed</h4>
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button variant="outline" onClick={() => setStatus("desktop_qr")}>
              Show QR Code Again
            </Button>
          </div>
        )}

      {status === "redirecting" && (
        <div className="flex items-center space-x-2 text-muted-foreground p-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}
