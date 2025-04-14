import { Suspense } from "react";

interface PaymentSuccessPageProps {
  searchParams?: {
    checkoutId?: string;
    // We'll add our custom sessionId here later
  };
}

async function PaymentSuccessContent({
  searchParams,
}: PaymentSuccessPageProps) {
  const checkoutId = (await searchParams)?.checkoutId;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl font-semibold mb-4">Payment Confirmed!</h1>
      <p className="mb-2">Thank you for your purchase.</p>
      <p className="text-sm text-gray-600 mb-6">
        Your analysis is being processed.
      </p>
      {checkoutId && (
        <p className="text-xs text-gray-500">Checkout ID: {checkoutId}</p>
      )}
      {/* We will add logic here later to use the sessionId from searchParams
          to proceed with the analysis flow (e.g., navigating to selfie upload) */}
    </main>
  );
}

// Using Suspense for good practice with searchParams
export default function PaymentSuccessPage(props: PaymentSuccessPageProps) {
  return (
    <Suspense fallback={<div>Loading payment details...</div>}>
      <PaymentSuccessContent {...props} />
    </Suspense>
  );
}
