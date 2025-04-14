import { NextResponse } from "next/server";
import { generateUUID } from "@/lib/utils";
import { db } from "@/db/index";
import { sessions } from "@/db/schema";
import { withErrorHandler } from "@/lib/api-helpers";

const SESSION_TTL_MINUTES = 60;

/**
 * POST handler to create a new analysis session.
 * Generates a unique session ID, stores it in the database with pending status,
 * and returns the ID to the client.
 */
const createSession = async () => {
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

    console.log(`Created session: ${sessionId}`);

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error("Failed to create session in database:", error);
    throw new Error("Failed to initiate analysis session.");
  }
};

export const POST = withErrorHandler(createSession);
