"use client";

import { useState } from "react";
// useRouter is no longer needed for this specific navigation
// import { useRouter } from "next/navigation";

export default function Home() {
  const productId = "4980fdb8-390b-4afb-8029-2959102b89e8";
  // const router = useRouter(); // No longer needed
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Create a session
      const sessionRes = await fetch("/api/v1/sessions", { method: "POST" });
      if (!sessionRes.ok) {
        const errorData = await sessionRes.json().catch(() => ({})); // Catch potential JSON parsing errors
        throw new Error(
          `Failed to create session: ${sessionRes.status} ${
            sessionRes.statusText
          } - ${errorData?.error?.message || "Unknown error"}`
        );
      }
      const { sessionId } = await sessionRes.json();

      if (!sessionId) {
        throw new Error("Session ID not received from server.");
      }

      // 2. Construct Polar checkout URL with metadata
      const checkoutUrl = `/api/v1/checkout?productId=${productId}&customerExternalId=${sessionId}`;

      // 3. Redirect user to Polar via our API route using standard browser navigation
      // router.push(checkoutUrl); // Replace this
      window.location.href = checkoutUrl; // With this

      // No need to setLoading(false) here as the user is navigating away
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
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6">MySeason</h1>
        <p className="text-lg text-gray-700 mb-8">
          Discover your perfect color palette with an AI-powered analysis.
        </p>
        <button
          onClick={handleStartAnalysis}
          disabled={isLoading}
          className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Processing..." : "Start New Analysis"}
        </button>
        {error && <p className="mt-4 text-red-600">Error: {error}</p>}
        {/* Section for retrieving previous analysis will go here */}
      </div>
    </main>
  );
}
