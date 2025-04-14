import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/db/index";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  console.error("FATAL: STRIPE_SECRET_KEY is not set for webhook handler.");
}
if (!webhookSecret) {
  console.error(
    "FATAL: STRIPE_WEBHOOK_SECRET is not set. Webhook verification will fail."
  );
}

const stripe = new Stripe(stripeSecretKey!, {
  typescript: true,
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    if (!webhookSecret) {
      console.error("Webhook secret is missing, cannot verify signature.");
      return NextResponse.json(
        { error: "Webhook secret not configured." },
        { status: 500 }
      );
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    let errorMessage = "Unknown webhook error";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    console.error(`❌ Error verifying webhook signature: ${errorMessage}`);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const internalSessionId = session.client_reference_id;
    const paymentIntentId = session.payment_intent as string;
    const stripeCheckoutId = session.id;

    if (!internalSessionId) {
      console.warn(
        `Webhook: checkout.session.completed event for Stripe session ${stripeCheckoutId} missing client_reference_id.`
      );
      return NextResponse.json({ received: true });
    }

    console.log(
      `Webhook: Handling checkout.session.completed for Stripe session ${stripeCheckoutId}, Internal Session ID: ${internalSessionId}`
    );

    try {
      const updatedSessions = await db
        .update(sessions)
        .set({
          status: "payment_complete",
          paymentIntentId: paymentIntentId,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, internalSessionId))
        .returning({ updatedId: sessions.id });

      if (updatedSessions.length === 0) {
        console.warn(
          `Webhook: Internal session ${internalSessionId} not found for successful Stripe checkout ${stripeCheckoutId}`
        );
      } else {
        console.log(
          `Webhook: Internal session ${internalSessionId} updated to payment_complete for Stripe checkout ${stripeCheckoutId}`
        );
      }
    } catch (dbError) {
      console.error(
        `Webhook: DB error updating internal session ${internalSessionId} for Stripe checkout ${stripeCheckoutId}:`,
        dbError
      );
      return NextResponse.json(
        { error: "Database update failed." },
        { status: 500 }
      );
    }
  } else {
    console.log(`Webhook: Received unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
