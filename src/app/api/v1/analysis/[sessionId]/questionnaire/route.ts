import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { questionnaireSchema } from "@/lib/schemas/questionnaire";
import { apiRateLimiter } from "@/lib/rate-limit";

interface RouteParams {
  params: {
    sessionId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const sessionId = (await params).sessionId;
  console.log(
    `Received POST request for /api/v1/analysis/${sessionId}/questionnaire`
  );

  if (!sessionId) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_SESSION_ID",
        message: "Session ID is required in the URL path.",
      },
      { status: 400 }
    );
  }

  // --- Rate Limiting ---
  const { success, limit, remaining, reset } = await apiRateLimiter.limit(
    sessionId
  );
  const rateLimitHeaders = {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": reset.toString(),
  };

  if (!success) {
    console.warn(`Rate limit exceeded for session: ${sessionId}`);
    return NextResponse.json(
      {
        success: false,
        error: "RATE_LIMIT_EXCEEDED",
        message:
          "Rate limit exceeded for questionnaire submission. Please try again later.",
      },
      { status: 429, headers: rateLimitHeaders }
    );
  }
  // --- End Rate Limiting ---

  let requestBody;
  try {
    requestBody = await request.json();
    console.log(
      `Received questionnaire data for session ${sessionId}:`,
      requestBody
    );
  } catch (error) {
    console.error(`Error parsing JSON body for session ${sessionId}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_JSON_BODY",
        message: "Could not parse request body as JSON.",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // Validate the incoming data using Zod schema
  const validationResult = questionnaireSchema.safeParse(requestBody);

  if (!validationResult.success) {
    console.error(
      `Invalid questionnaire data for session ${sessionId}:`,
      validationResult.error.flatten()
    );
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_INPUT_DATA",
        message: "Submitted data failed validation.",
        details: validationResult.error.flatten(), // Provide specific validation errors
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // Data is validated
  const validatedData = validationResult.data;

  try {
    // Find the session and verify status
    const currentSession = await db
      .select({
        id: sessions.id,
        status: sessions.status,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!currentSession || currentSession.length === 0) {
      console.error(
        `Questionnaire submission: Session not found for ID: ${sessionId}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_NOT_FOUND",
          message: "Session ID not found.",
        },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    const session = currentSession[0];

    if (!session) {
      console.error(
        `Questionnaire submission: Session not found for ID: ${sessionId}`
      );
      return NextResponse.json(
        { success: false, error: "SESSION_NOT_FOUND" },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    // Check expiry
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      console.log(
        `Questionnaire submission: Session ${sessionId} has expired.`
      );
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_EXPIRED",
          message: "This analysis session has expired.",
        },
        { status: 410, headers: rateLimitHeaders }
      );
    }

    // Check status
    if (session.status !== "awaiting_questionnaire") {
      console.warn(
        `Questionnaire submission: Session ${sessionId} is in unexpected state: ${session.status}. Expected 'awaiting_questionnaire'.`
      );
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_SESSION_STATE",
          message: `Session is not awaiting questionnaire (current status: ${session.status}).`,
        },
        { status: 409, headers: rateLimitHeaders }
      );
    }

    // Update the session with questionnaire data and new status
    await db
      .update(sessions)
      .set({
        questionnaireData: validatedData, // Store the validated JSON data
        status: "questionnaire_complete", // Move to the next state
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));

    console.log(
      `Session ${sessionId} updated successfully with questionnaire data. Status set to questionnaire_complete.`
    );

    return NextResponse.json(
      { success: true },
      { status: 200, headers: rateLimitHeaders }
    );
  } catch (dbError) {
    console.error(
      `Database error processing questionnaire for session ${sessionId}:`,
      dbError
    );
    return NextResponse.json(
      {
        success: false,
        error: "DATABASE_ERROR",
        message:
          "An internal error occurred while saving the questionnaire data.",
      },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
