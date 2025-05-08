import { NextRequest, NextResponse } from "next/server";
import { put, PutBlobResult } from "@vercel/blob";
import { db } from "@/db/index";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiRateLimiter } from "@/lib/rate-limit"; // Assuming this can be reused

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_SESSION_ID",
        message: "Session ID is required.",
      },
      { status: 400 }
    );
  }

  // --- 1. Rate Limiting (similar to /api/v1/blob/upload) ---
  const {
    success: rateLimitSuccess,
    limit,
    remaining,
    reset,
  } = await apiRateLimiter.limit(sessionId);
  const rateLimitHeaders = {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": reset.toString(),
  };

  if (!rateLimitSuccess) {
    return NextResponse.json(
      {
        success: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: "Rate limit exceeded for uploads.",
      },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  try {
    // --- 2. Session Validation (similar to onBeforeGenerateToken in /api/v1/blob/upload) ---
    console.log(`Verifying session ID: ${sessionId} for proxy upload.`);
    const sessionRecord = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      columns: { id: true, status: true, expiresAt: true },
    });

    if (!sessionRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_NOT_FOUND",
          message: `Session not found: ${sessionId}`,
        },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    if (sessionRecord.status !== "payment_complete") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_SESSION_STATE",
          message: `Session ${sessionId} is not yet paid (${sessionRecord.status}). Upload denied.`,
        },
        { status: 403, headers: rateLimitHeaders }
      );
    }

    if (sessionRecord.expiresAt && sessionRecord.expiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_EXPIRED",
          message: `Session ${sessionId} has expired. Upload denied.`,
        },
        { status: 410, headers: rateLimitHeaders }
      );
    }
    console.log(
      `Session ${sessionId} verified and paid. Proceeding with proxy upload.`
    );

    // --- 3. File Handling & Upload to Vercel Blob ---
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_FILE",
          message: "No file provided in the request.",
        },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Generate a unique filename, e.g., using sessionId and timestamp
    const filename = `${sessionId}-mobile-${Date.now()}.${
      file.name.split(".").pop() || "jpg"
    }`;

    console.log(`Uploading ${filename} to Vercel Blob...`);

    const blob = await put(filename, file, {
      access: "public", // Or 'private' if your access patterns require it
      contentType: file.type,
      // Optionally add tokenPayload if needed for other server-side Vercel Blob features,
      // though for a simple proxy, it might not be directly used here.
      // token: process.env.BLOB_READ_WRITE_TOKEN!, // \`put\` uses environment variable by default
    });

    console.log(`Upload successful for ${filename}. Blob URL: ${blob.url}`);

    // --- 4. Respond to Mobile App ---
    return NextResponse.json(
      {
        success: true,
        blobUrl: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
      },
      { status: 200, headers: rateLimitHeaders }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error during proxy upload.";
    console.error(
      `Error in proxy-image-upload for session ${sessionId}:`,
      error
    );
    // Do not attempt to delete blob here as it might not have been uploaded or \`blob\` variable might not be defined
    return NextResponse.json(
      { success: false, error: "PROXY_UPLOAD_FAILED", message },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
