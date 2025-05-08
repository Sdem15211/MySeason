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

        console.log(`Verifying session ID: ${sessionId} for upload.`);

        const sessionRecord = await db.query.sessions.findFirst({
          where: eq(sessions.id, sessionId),
        });

        if (!sessionRecord) {
          throw new Error(`Session not found: ${sessionId}`);
        }

        if (sessionRecord.status !== "payment_complete") {
          throw new Error(
            `Session ${sessionId} is not yet paid (${sessionRecord.status}). Upload denied.`
          );
        }

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
            sessionId: sessionId,
          }),
          token: process.env.BLOB_READ_WRITE_TOKEN!,
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
        }
      },
    });

    return NextResponse.json(jsonResponse, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error handling blob upload authorization:", message);
    return NextResponse.json({ error: message }, { status: 400, headers });
  }
}
