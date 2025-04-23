"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { SelfieAnalyzer } from "./selfie-analyzer";
import { signIn, useSession } from "@/lib/auth-client";
import { Session } from "@/lib/auth";

interface PaymentSuccessContentProps {
  internalSessionId: string;
  authSession: Session | null;
}

export function PaymentSuccessContent({
  internalSessionId,
  authSession,
}: PaymentSuccessContentProps) {
  useEffect(() => {
    const performAnonymousSignIn = async () => {
      try {
        console.log("Attempting anonymous sign-in...");
        await signIn.anonymous();
        console.log("Anonymous sign-in successful.");
      } catch (error) {
        console.error("Anonymous sign-in failed:", error);
        toast.error(
          "Could not start a secure session. Analysis saving may not work."
        );
      }
    };

    if (!authSession) {
      performAnonymousSignIn();
    }
  }, []);

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
