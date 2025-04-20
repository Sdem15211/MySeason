"use client";

import { SelfieAnalyzer } from "./selfie-analyzer";

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
      <div className="flex justify-center">
        <SelfieAnalyzer sessionId={internalSessionId} />
      </div>
    </div>
  );
}
