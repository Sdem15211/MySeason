import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiRateLimiter } from "@/lib/rate-limit";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // --- 1. Extract Session ID and Apply Rate Limiting Early ---
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session ID." }, { status: 400 });
  }

  const { success, limit, remaining, reset } = await apiRateLimiter.limit(
    sessionId
  );

  const headers = {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": reset.toString(),
  };

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded for uploads. Please try again later." },
      {
        status: 429,
        headers: headers,
      }
    );
  }
  // --- End Rate Limiting ---

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string) => {
        console.log(
          `Authorizing upload for pathname: ${pathname} (Session: ${sessionId})`
        );

        // --- Session Verification (already have sessionId) ---
        // const url = new URL(request.url); // No longer needed
        // const sessionId = url.searchParams.get("sessionId"); // No longer needed

        // if (!sessionId) { // No longer needed
        //   throw new Error("Missing session ID for upload authorization.");
        // }

        console.log(`Verifying session ID: ${sessionId} for upload.`); // Keep logging

        const sessionRecord = await db.query.sessions.findFirst({
          where: eq(sessions.id, sessionId),
        });

        if (!sessionRecord) {
          throw new Error(`Session not found: ${sessionId}`);
        }

        // Check if payment is complete (adjust status string if needed)
        if (sessionRecord.status !== "payment_complete") {
          throw new Error(
            `Session ${sessionId} is not yet paid (${sessionRecord.status}). Upload denied.`
          );
        }

        // Check expiry (optional but good practice)
        if (sessionRecord.expiresAt && sessionRecord.expiresAt < new Date()) {
          throw new Error(`Session ${sessionId} has expired. Upload denied.`);
        }

        console.log(
          `Session ${sessionId} verified and paid. Proceeding with token generation.`
        );
        // --- End Session Verification ---

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumFileSizeInBytes: 10 * 1024 * 1024, // 10 MB
          pathname: pathname,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            sessionId: sessionId, // Use the already validated sessionId
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log(
          "Client upload completed callback triggered:",
          blob,
          tokenPayload
        );
        try {
          if (typeof tokenPayload === "string") {
            const payload = JSON.parse(tokenPayload);
            console.log("Post-upload logic", payload, blob.url);
          } else {
            console.warn(
              "onUploadCompleted: tokenPayload is missing or not a string."
            );
          }
        } catch (error) {
          console.error("Error in onUploadCompleted:", error);
          // Must return 200 OK to Vercel's webhook, even if internal logic fails
        }
      },
    });

    // Add rate limit headers to successful response
    return NextResponse.json(jsonResponse, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error handling blob upload authorization:", message);
    // Add rate limit headers to error response
    return NextResponse.json({ error: message }, { status: 400, headers });
  }
}
