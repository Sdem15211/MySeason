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
    <div className="container h-screen flex flex-col gap-12 items-center justify-center mx-auto">
      <div className="flex flex-col gap-2 items-center justify-center">
        <h1 className="title">Time to take your selfie! 📸</h1>
        <p className="subtitle">
          Use your phone’s camera for the best quality.
          <br />
          Scan the QR code below to continue on your mobile device
        </p>
      </div>
      <div className="flex justify-center">
        <SelfieAnalyzer sessionId={internalSessionId} />
      </div>
    </div>
  );
}
