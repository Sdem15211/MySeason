import Stripe from "stripe";
import { PaymentSuccessContent } from "@/components/features/analysis/payment-success-content";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error(
    "FATAL: STRIPE_SECRET_KEY environment variable is not set for payment success page."
  );
  // In a real app, you might throw an error or have a dedicated error page
  // For now, we'll let it proceed but log the error prominently.
}
// Add a check to prevent creating Stripe client if key is missing
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { typescript: true })
  : null;

interface PaymentSuccessPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const authSession = await auth.api.getSession({
    headers: await headers(),
  });
  const stripeCheckoutId = (await searchParams)?.session_id as
    | string
    | undefined;

  // Render error immediately if Stripe client couldn't be initialized
  if (!stripe) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Configuration Error
        </h1>
        <p>The server is missing necessary configuration to verify payments.</p>
      </div>
    );
  }

  if (!stripeCheckoutId) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Error</h1>
        <p>Missing payment session information in URL.</p>
      </div>
    );
  }

  try {
    console.log(`Verifying Stripe Checkout session: ${stripeCheckoutId}`);
    const session = await stripe.checkout.sessions.retrieve(stripeCheckoutId);

    if (session.status === "complete" && session.payment_status === "paid") {
      const internalSessionId = session.client_reference_id;

      if (!internalSessionId) {
        console.error(
          `Stripe session ${stripeCheckoutId} completed but missing client_reference_id.`
        );
        return (
          <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="text-3xl font-bold text-red-600 mb-4">
              Verification Error
            </h1>
            <p>
              There was an issue linking your payment to your analysis session.
              Please contact support.
            </p>
            <p className="text-sm text-gray-500">Ref: {stripeCheckoutId}</p>
          </div>
        );
      }

      console.log(
        `Payment verified for Stripe session ${stripeCheckoutId}, Internal session: ${internalSessionId}`
      );
      // Render the client component with the internal ID
      return (
        <PaymentSuccessContent
          internalSessionId={internalSessionId}
          authSession={authSession}
        />
      );
    } else {
      console.warn(
        `Stripe session ${stripeCheckoutId} status not complete/paid: Status=${session.status}, PaymentStatus=${session.payment_status}`
      );
      // Handle cases where payment wasn't successful or is still processing
      let message = "Your payment is still processing or was not successful.";
      if (session.status === "open") {
        message =
          "Your payment session is still open. Please complete the payment process.";
      } else if (session.status === "expired") {
        message =
          "Your payment session has expired. Please start a new analysis.";
      }

      return (
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold text-orange-600 mb-4">
            Payment Not Complete
          </h1>
          <p>{message}</p>
          <p className="text-sm text-gray-500 mt-2">
            Status: {session.status}, Payment Status: {session.payment_status}
          </p>
          {/* Optionally add a link to home or retry */}
        </div>
      );
    }
  } catch (error) {
    console.error(
      `Error retrieving Stripe session ${stripeCheckoutId}:`,
      error
    );
    let errorMessage =
      "Could not verify payment status. Please try again later or contact support.";
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === "resource_missing"
    ) {
      errorMessage = "Invalid payment session ID provided.";
    }

    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Verification Error
        </h1>
        <p>{errorMessage}</p>
        {error instanceof Error && process.env.NODE_ENV === "development" && (
          <p className="text-sm text-gray-500 mt-2">Details: {error.message}</p>
        )}
      </div>
    );
  }
}
