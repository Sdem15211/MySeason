import { NextResponse, type NextRequest } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/db/index";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const { blobUrl, sessionId } = await request.json();

  if (!blobUrl || typeof blobUrl !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_BLOB_URL",
        message: "Blob URL is required.",
      },
      { status: 400 }
    );
  }

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_SESSION_ID",
        message: "Session ID is required for authorization.",
      },
      { status: 400 }
    );
  }

  try {
    // --- Authorize based on sessionId ---
    console.log(`Authorizing delete request for session: ${sessionId}`);
    const sessionRecord = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      columns: {
        // Select only necessary columns
        id: true,
        expiresAt: true,
      },
    });

    if (!sessionRecord) {
      console.warn(`Attempted deletion for non-existent session: ${sessionId}`);
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "Session not found.",
        },
        { status: 404 }
      );
    }

    // ---> Add Expiry Check <---\
    if (
      sessionRecord.expiresAt &&
      new Date(sessionRecord.expiresAt) < new Date()
    ) {
      console.log(`Deletion attempt for expired session ${sessionId}.`);
      // Don't proceed with deletion, just inform the client
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_EXPIRED",
          message: "This analysis session has expired, cannot delete blob.",
        },
        { status: 410 }
      );
    }
    // ---> End Expiry Check <---\

    console.log(
      `Session ${sessionId} found and not expired. Proceeding with deletion of ${blobUrl}`
    );
    // --- End Authorization ---

    await del(blobUrl);

    return NextResponse.json({
      success: true,
      message: "Blob deleted successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error during blob deletion";
    console.error(
      `Error deleting blob ${blobUrl} for session ${sessionId}:`,
      error
    );
    return NextResponse.json(
      { success: false, error: "DELETE_FAILED", message },
      { status: 500 }
    );
  }
}
