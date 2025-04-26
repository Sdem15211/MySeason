import { MobileCameraCapture } from "@/components/features/analysis/mobile-camera-capture";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AlertTriangle } from "lucide-react";

interface CapturePageProps {
  params: {
    sessionId: string;
  };
}

function MobileCaptureClient({ sessionId }: { sessionId: string }) {
  console.log("[MobileCaptureClient] Rendering with sessionId:", sessionId);
  return <MobileCameraCapture sessionId={sessionId} context="secondary" />;
}

// Server-side function to check selfie status
async function hasSelfieBeenValidated(sessionId: string): Promise<boolean> {
  try {
    console.log(
      `[CapturePage] Checking selfie validation status for session: ${sessionId}`
    );
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      columns: {
        imageBlobUrl: true,
        status: true,
      },
    });

    if (!session) {
      console.warn(`[CapturePage] Session not found: ${sessionId}`);
      return false;
    }

    const isValidated = !!session.imageBlobUrl;
    console.log(
      `[CapturePage] Session ${sessionId} validated status: ${isValidated}`
    );
    return isValidated;
  } catch (error) {
    console.error(
      `[CapturePage] Error checking session status for ${sessionId}:`,
      error
    );
    return false;
  }
}

export default async function CapturePage({ params }: CapturePageProps) {
  console.log("[CapturePage] Rendering with params:", params);
  const sessionId = (await params)?.sessionId;

  if (!sessionId) {
    return (
      <div className="container mx-auto flex h-screen flex-col items-center justify-center px-4 py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="text-muted-foreground">Missing session ID in URL.</p>
      </div>
    );
  }

  // --- Server-Side Check ---
  const alreadyValidated = await hasSelfieBeenValidated(sessionId);

  if (alreadyValidated) {
    return (
      <div className="container mx-auto flex h-screen flex-col items-center justify-center px-4 py-8 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-green-500 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h1 className="text-2xl font-semibold mb-2">
          Selfie Already Submitted
        </h1>
        <p className="text-muted-foreground max-w-md">
          A selfie has already been successfully submitted for this analysis
          session. You can close this page or return to your original device.
        </p>
      </div>
    );
  }
  // --- End Server-Side Check ---

  // If not validated, render the capture UI
  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-semibold mb-2 text-center">
        Take Your Selfie
      </h1>
      <MobileCaptureClient sessionId={sessionId} />
    </div>
  );
}
