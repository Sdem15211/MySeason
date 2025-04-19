import { MobileCameraCapture } from "@/components/features/analysis/mobile-camera-capture";

interface CapturePageProps {
  params: {
    sessionId: string;
  };
}

// Use a Client Component wrapper to handle state/effects if needed,
// or directly render if MobileCameraCapture handles everything.
function CaptureClient({ sessionId }: { sessionId: string }) {
  // Can add more wrapper logic here if needed in the future
  return <MobileCameraCapture sessionId={sessionId} />;
}

export default function CapturePage({ params }: CapturePageProps) {
  const { sessionId } = params;

  if (!sessionId) {
    // Handle missing session ID case
    return (
      <div className="container mx-auto flex h-screen items-center justify-center px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="text-muted-foreground">Missing session ID in URL.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-semibold mb-2 text-center">
        Take Your Selfie
      </h1>
      {/* Removed specific instructions here as they are now in the component */}
      {/* Suspense can be added if MobileCameraCapture needs it */}
      <CaptureClient sessionId={sessionId} />
    </div>
  );
}
