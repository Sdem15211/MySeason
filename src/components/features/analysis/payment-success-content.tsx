"use client";

import * as React from "react";
import { SelfieAnalyzer } from "./selfie-analyzer"; // Adjust path if needed

interface PaymentSuccessContentProps {
  internalSessionId: string;
}

export function PaymentSuccessContent({
  internalSessionId,
}: PaymentSuccessContentProps) {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        Payment Successful!
      </h1>
      <p className="mb-6 text-lg">
        Thank you for your payment. You can now upload your selfie for analysis.
      </p>
      <p className="text-sm text-gray-500 mb-8">
        Session ID: {internalSessionId}
      </p>

      <div className="flex justify-center">
        <SelfieAnalyzer sessionId={internalSessionId} />
      </div>
    </div>
  );
}
