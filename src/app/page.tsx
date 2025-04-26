"use client";

import { Button } from "@/components/ui/button";
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
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Button
        variant="season"
        size="lg"
        onClick={handleStartAnalysis}
        disabled={isLoading}
        className="px-14"
      >
        {isLoading ? "Starting..." : "Start New Analysis"}
        <svg
          width="21"
          height="16"
          viewBox="0 0 21 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20.1684 9.21212C20.3807 8.99971 20.5 8.71165 20.5 8.41129C20.5 8.11094 20.3807 7.82288 20.1684 7.61047L13.7606 1.20274C13.6561 1.09455 13.5311 1.00826 13.393 0.948895C13.2548 0.889531 13.1061 0.858283 12.9557 0.856976C12.8053 0.855669 12.6562 0.884329 12.517 0.941283C12.3778 0.998236 12.2513 1.08234 12.1449 1.1887C12.0386 1.29505 11.9545 1.42152 11.8975 1.56072C11.8406 1.69993 11.8119 1.84908 11.8132 1.99949C11.8145 2.14989 11.8458 2.29852 11.9051 2.43671C11.9645 2.57491 12.0508 2.6999 12.159 2.80439L16.6332 7.27859L1.63271 7.27859C1.33229 7.27859 1.04419 7.39792 0.83176 7.61035C0.619337 7.82277 0.5 8.11088 0.5 8.41129C0.5 8.71171 0.619337 8.99982 0.83176 9.21224C1.04419 9.42466 1.33229 9.544 1.63271 9.544L16.6332 9.544L12.159 14.0182C11.9526 14.2318 11.8385 14.518 11.8411 14.815C11.8436 15.1119 11.9628 15.396 12.1728 15.6061C12.3828 15.8161 12.6669 15.9352 12.9639 15.9378C13.2609 15.9404 13.547 15.8262 13.7606 15.6199L20.1684 9.21212Z"
            fill="#3D3533"
          />
        </svg>
      </Button>
    </div>
  );
}
