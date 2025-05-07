import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import { generateUUID } from "@/lib/node-utils";
import { db } from "@/db/index";
import { sessions } from "@/db/schema";
import { withErrorHandler } from "@/lib/api-helpers";
import { headers } from "next/headers";
import { sessionCreateRateLimiter } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";

// --- Configuration ---
const SESSION_TTL_MINUTES = 60;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const paymentAmountCents = process.env.MOBILE_PAYMENT_AMOUNT_CENTS;
const paymentCurrency = process.env.PAYMENT_CURRENCY;

// --- Environment Variable Checks ---
if (!stripeSecretKey) {
  console.error("FATAL: STRIPE_SECRET_KEY environment variable is not set.");
}
if (!stripePublishableKey) {
  console.error(
    "FATAL: STRIPE_PUBLISHABLE_KEY environment variable is not set."
  );
}
if (!paymentAmountCents) {
  console.error(
    "FATAL: MOBILE_PAYMENT_AMOUNT_CENTS environment variable is not set."
  );
}
if (!paymentCurrency) {
  console.error("FATAL: PAYMENT_CURRENCY environment variable is not set.");
}

// --- Stripe SDK Initialization ---
const stripe = new Stripe(stripeSecretKey!, {
  typescript: true,
});

// --- Core Logic Function ---
const createMobilePaymentIntentLogic = async (request: NextRequest) => {
  const internalSessionId = generateUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MINUTES * 60 * 1000);
  let paymentIntentIdToStore: string | null = null;

  // 1. Create internal session in the database (initially without paymentIntentId)
  try {
    await db
      .insert(sessions)
      .values({
        id: internalSessionId,
        status: "pending_payment",
        expiresAt: expiresAt,
      })
      .execute();
    console.log(
      `Created initial internal session for mobile: ${internalSessionId}`
    );
  } catch (error) {
    console.error(
      "Failed to create initial internal session in database for mobile:",
      error
    );
    throw new Error("Failed to initiate analysis session (DB Init).", {
      cause: error,
    });
  }

  // 2. Create Stripe PaymentIntent
  try {
    if (!paymentAmountCents || !paymentCurrency) {
      throw new Error("Payment amount or currency is not configured.");
    }

    const amount = parseInt(paymentAmountCents, 10);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid payment amount configured.");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: paymentCurrency.toLowerCase(),
      metadata: {
        internal_session_id: internalSessionId, // Crucial for webhook reconciliation
        client_platform: "mobile",
      },
      automatic_payment_methods: { enabled: true },
    });
    paymentIntentIdToStore = paymentIntent.id;

    console.log(
      `Created Stripe PaymentIntent: ${paymentIntent.id} for internal session: ${internalSessionId}`
    );

    // 3. Update session with PaymentIntent ID
    await db
      .update(sessions)
      .set({ paymentIntentId: paymentIntent.id })
      .where(eq(sessions.id, internalSessionId));

    console.log(
      `Updated session ${internalSessionId} with PaymentIntent ID: ${paymentIntent.id}`
    );

    return NextResponse.json({
      internalSessionId: internalSessionId,
      clientSecret: paymentIntent.client_secret,
      publishableKey: stripePublishableKey,
    });
  } catch (stripeError: any) {
    console.error(
      "Failed to create Stripe PaymentIntent or update session for mobile:",
      stripeError
    );
    // Attempt to clean up or mark the initial session as failed if PI creation failed
    // This part can be complex depending on desired rollback logic
    try {
      await db
        .update(sessions)
        .set({ status: "payment_failed" })
        .where(eq(sessions.id, internalSessionId));
    } catch (cleanupError) {
      console.error(
        `Failed to mark session ${internalSessionId} as payment_failed after Stripe error:`,
        cleanupError
      );
    }
    throw new Error(
      "Failed to initiate payment session (Stripe API or DB Update).",
      { cause: stripeError }
    );
  }
};

const protectedCreateMobilePaymentIntent = withErrorHandler(
  createMobilePaymentIntentLogic
);

// --- POST Handler ---
export async function POST(request: NextRequest) {
  const ip = (await headers()).get("x-forwarded-for") ?? "127.0.0.1";
  // Ensure sessionCreateRateLimiter is defined or use a relevant one
  const { success, limit, remaining, reset } =
    await sessionCreateRateLimiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }

  console.log("Received POST request to /api/v1/mobile/initiate-payment");
  const response = await protectedCreateMobilePaymentIntent(request, {});

  // Pass through rate limit headers on success
  if (response.ok) {
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());
  }
  return response;
}
