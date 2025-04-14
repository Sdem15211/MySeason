import { NextResponse } from "next/server";
import { NextRequest } from "next/server"; // Use NextRequest for typed request access if needed later

// Define a base type for API handlers for clarity
// Using unknown for context as it varies depending on route structure (e.g., params)
type ApiHandler<T = unknown> = (
  request: NextRequest, // Using NextRequest for better type safety potentially
  context: { params?: unknown } // Basic context, can be refined
) => Promise<NextResponse<T>>;

/**
 * Wraps an API route handler with basic error handling.
 * Catches errors, logs them, and returns a standardized JSON error response.
 *
 * @param handler The original API route handler.
 * @returns A new handler function with error handling baked in.
 */
export function withErrorHandler<T = unknown>(
  handler: ApiHandler<T>
): ApiHandler<T> {
  return async (request, context) => {
    try {
      // Execute the original handler
      return await handler(request, context);
    } catch (error) {
      // Log the error for server-side observability
      console.error("API Route Error:", error);

      // Determine error message and status
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      // Check for a custom status property on the error, default to 500
      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : 500;

      // Return a standardized JSON error response
      // Ensure NextResponse generic matches the handler's expected type or use a specific error type
      return NextResponse.json(
        { error: { message, status } },
        { status }
      ) as NextResponse<T>; // Cast might be needed depending on usage
    }
  };
}

// Future Enhancements:
// - Add request body/param validation using Zod
// - Add authentication/authorization checks
// - Inject dependencies (like db client)
