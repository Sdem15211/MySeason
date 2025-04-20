"use client"; // Error components must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button"; // Assuming Shadcn Button is available
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service or console
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-2 text-foreground">
        Something went wrong!
      </h2>
      <p className="text-muted-foreground mb-6">
        An unexpected error occurred. Please try again.
      </p>
      {error?.digest && (
        <p className="text-xs text-muted-foreground mb-6">
          Error Digest: {error.digest}
        </p>
      )}
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        variant="destructive"
      >
        Try Again
      </Button>
    </div>
  );
}
