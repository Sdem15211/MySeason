import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-helpers";

/**
 * Health check endpoint implementation
 * @param _request The incoming request (NextRequest) - Ignored
 * @param _context The route context (unused here) - Ignored
 * @returns A simple OK response
 */
const getHealth = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: unknown
) => {
  // If the handler needed to throw an error, withErrorHandler would catch it
  // e.g., if (!db.isConnected()) throw new Error('Database not connected');
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Exported GET handler wrapped with error handling.
 */
export const GET = withErrorHandler(getHealth);
