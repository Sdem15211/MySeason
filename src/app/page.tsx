"use client";

import { useState } from "react";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sessionRes = await fetch("/api/v1/sessions", { method: "POST" });

      if (!sessionRes.ok) {
        const errorData = await sessionRes.json().catch(() => ({}));
        throw new Error(
          `Failed to initiate session: ${sessionRes.status} ${
            sessionRes.statusText
          } - ${errorData?.error || "Unknown error"}`
        );
      }
      const { sessionId, checkoutUrl } = await sessionRes.json();

      if (!sessionId) {
        throw new Error("Session ID not received from server.");
      }
      if (!checkoutUrl) {
        throw new Error("Stripe Checkout URL not received from server.");
      }

      console.log(`Session created: ${sessionId}, redirecting to Stripe...`);

      window.location.href = checkoutUrl;
    } catch (err) {
      console.error("Error starting analysis:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">MySeason</h1>
      <p className="mb-6 text-lg text-center max-w-md">
        Discover your perfect color palette with AI-powered analysis.
      </p>
      <button
        onClick={handleStartAnalysis}
        disabled={isLoading}
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Processing..." : "Start New Analysis"}
      </button>
      {error && <p className="mt-4 text-red-600">Error: {error}</p>}
      {/* Add "View Previous Analysis" section later if needed */}
    </main>
  );
}
