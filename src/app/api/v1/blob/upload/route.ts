import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string) => {
        console.log(`Authorizing upload for pathname: ${pathname}`);

        // --- Session Verification ---
        const url = new URL(request.url);
        const sessionId = url.searchParams.get("sessionId");

        if (!sessionId) {
          throw new Error("Missing session ID for upload authorization.");
        }

        console.log(`Verifying session ID: ${sessionId} for upload.`);

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
            sessionId: sessionId,
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

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error handling blob upload authorization:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
