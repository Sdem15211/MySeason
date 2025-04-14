import { Webhooks } from "@polar-sh/nextjs";
import { db } from "@/db/index";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

// Define a simple interface for the expected checkout data within the payload.
// Replace with actual type from Polar SDK if identified.
interface CheckoutData {
  id: string;
  status: string;
  metadata?: { [key: string]: unknown };
}

const polarWebhookSecret = process.env.POLAR_WEBHOOK_SECRET;

if (!polarWebhookSecret) {
  console.error(
    "FATAL: POLAR_WEBHOOK_SECRET environment variable is not set. Webhook verification will fail."
  );
}

export const POST = Webhooks({
  webhookSecret: polarWebhookSecret || "",

  onPayload: async (payload) => {
    console.log(`Webhook: Received event type: ${payload.type}`);

    switch (payload.type) {
      case "checkout.updated": {
        const checkoutData = payload.data as CheckoutData;
        console.log(
          `Webhook: Handling checkout.updated for ID: ${checkoutData.id}, Status: ${checkoutData.status}`
        );

        // Extract sessionId from metadata
        const sessionId = checkoutData.metadata?.sessionId as
          | string
          | undefined;

        if (!sessionId) {
          console.warn(
            `Webhook: checkout.updated event for ${checkoutData.id} missing sessionId in metadata.`
          );
          return;
        }

        // Process successful payments
        if (checkoutData.status === "succeeded") {
          try {
            const updatedSessions = await db
              .update(sessions)
              .set({
                status: "payment_complete",
                paymentIntentId: checkoutData.id,
                updatedAt: new Date(),
              })
              .where(eq(sessions.id, sessionId))
              .returning({ updatedId: sessions.id });

            if (updatedSessions.length === 0) {
              console.warn(
                `Webhook: Session ${sessionId} not found for successful checkout ${checkoutData.id}`
              );
            } else {
              console.log(
                `Webhook: Session ${sessionId} updated to payment_complete for checkout ${checkoutData.id}`
              );
              // TODO: Implement logic to notify the user/frontend to proceed
              // (e.g., via WebSockets, Pusher, or client-side polling if necessary)
            }
          } catch (dbError) {
            console.error(
              `Webhook: DB error updating session ${sessionId} for checkout ${checkoutData.id}:`,
              dbError
            );
          }
        } else {
          console.log(
            `Webhook: Checkout ${checkoutData.id} (Session ${sessionId}) has status ${checkoutData.status}. No 'payment_complete' DB update.`
          );
        }
        break;
      }

      default:
        console.log(
          `Webhook: Received unhandled event type: ${payload.type}. No specific action taken.`
        );
    }
  },
});
