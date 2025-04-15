import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: {
    sessionId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const sessionId = (await params).sessionId;
  console.log(`Received GET status request for session ${sessionId}`);

  if (!sessionId) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_SESSION_ID",
        message: "Session ID required.",
      },
      { status: 400 }
    );
  }

  try {
    const results = await db
      .select({
        status: sessions.status,
        analysisId: sessions.analysisId,
        // Add expiresAt to potentially notify client if expired during polling?
        // expiresAt: sessions.expiresAt
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    const session = results[0];

    if (!session) {
      console.error(`Status check: Session not found for ID: ${sessionId}`);
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_NOT_FOUND",
          message: "Session not found.",
        },
        { status: 404 }
      );
    }

    // TODO: Add check for session expiry here as well?

    const responsePayload: {
      success: boolean;
      status: string;
      analysisId?: string | null;
    } = {
      success: true,
      status: session.status,
    };

    if (session.status === "analysis_complete" && session.analysisId) {
      responsePayload.analysisId = session.analysisId;
    }

    console.log(
      `Status check for ${sessionId}: Returning status ${session.status}`
    );
    return NextResponse.json(responsePayload, { status: 200 });
  } catch (dbError) {
    console.error(
      `Database error checking status for session ${sessionId}:`,
      dbError
    );
    return NextResponse.json(
      {
        success: false,
        error: "DATABASE_ERROR",
        message:
          "An internal error occurred while checking the session status.",
      },
      { status: 500 }
    );
  }
}
