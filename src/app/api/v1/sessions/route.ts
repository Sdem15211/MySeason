import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import { generateUUID } from "@/lib/node-utils";
import { db } from "@/db/index";
import { sessions } from "@/db/schema";
import { withErrorHandler } from "@/lib/api-helpers";
import { headers } from "next/headers";
import { sessionCreateRateLimiter } from "@/lib/rate-limit";

const SESSION_TTL_MINUTES = 60;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const stripePriceId = process.env.STRIPE_PRICE_ID;

if (!stripeSecretKey) {
  console.error("FATAL: STRIPE_SECRET_KEY environment variable is not set.");
}
if (!webhookSecret) {
  console.error(
    "FATAL: STRIPE_WEBHOOK_SECRET environment variable is not set."
  );
}
if (!appUrl) {
  console.error("FATAL: NEXT_PUBLIC_APP_URL environment variable is not set.");
}
if (!stripePriceId) {
  console.error("FATAL: STRIPE_PRICE_ID environment variable is not set.");
}

const stripe = new Stripe(stripeSecretKey!, {
  typescript: true,
});

const createSessionAndCheckoutLogic = async () => {
  if (!stripePriceId || !appUrl) {
    throw new Error(
      "Server configuration error: Missing Stripe Price ID or App URL."
    );
  }

  const sessionId = generateUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MINUTES * 60 * 1000);

  try {
    await db
      .insert(sessions)
      .values({
        id: sessionId,
        status: "pending_payment",
        expiresAt: expiresAt,
      })
      .execute();

    console.log(`Created internal session: ${sessionId}`);
  } catch (error) {
    console.error("Failed to create internal session in database:", error);
    throw new Error("Failed to initiate analysis session (DB).");
  }

  try {
    const successUrl = `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/payment-cancelled`;

    const checkoutSession = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: sessionId,
    });

    console.log(`Created Stripe Checkout session: ${checkoutSession.id}`);

    return NextResponse.json({
      sessionId: sessionId,
      checkoutUrl: checkoutSession.url,
    });
  } catch (stripeError) {
    console.error("Failed to create Stripe Checkout session:", stripeError);
    throw new Error("Failed to initiate payment session (Stripe).");
  }
};

const protectedCreateSessionAndCheckout = withErrorHandler(
  createSessionAndCheckoutLogic
);

export async function POST(request: NextRequest, context: {}) {
  const ip = (await headers()).get("x-forwarded-for") ?? "127.0.0.1";

  const { success, limit, remaining, reset } =
    await sessionCreateRateLimiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
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

  const response = await protectedCreateSessionAndCheckout(request, context);

  if (response.ok) {
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());
  }

  return response;
}
