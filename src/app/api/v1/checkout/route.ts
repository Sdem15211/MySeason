import { Checkout } from "@polar-sh/nextjs";

// Ensure environment variables are set
const polarAccessToken = process.env.POLAR_ACCESS_TOKEN;
const polarSuccessUrlPath = process.env.POLAR_SUCCESS_URL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!polarAccessToken) {
  console.error("POLAR_ACCESS_TOKEN environment variable is not set.");
  // In a real app, you might want to throw an error or return a more specific response
  // For now, we'll let the Checkout handler potentially fail if it requires the token internally.
}
if (!polarSuccessUrlPath) {
  console.error("POLAR_SUCCESS_URL environment variable is not set.");
  // Handle missing configuration appropriately
}
if (!appUrl) {
  console.error("NEXT_PUBLIC_APP_URL environment variable is not set.");
  // Handle missing configuration appropriately
}

// Construct the absolute success URL
// Example: http://localhost:3000/payment-success
// We will add session information via query parameters later when calling this endpoint
const absoluteSuccessUrl =
  appUrl && polarSuccessUrlPath ? `${appUrl}${polarSuccessUrlPath}` : undefined;

if (!absoluteSuccessUrl) {
  // Consider throwing an error or returning a 500 response if the URL couldn't be constructed
  console.error("Could not construct absolute success URL for Polar checkout.");
}

// Initialize the GET handler using Polar's Checkout helper
export const GET = Checkout({
  // Non-null assertion used here based on the assumption that Checkout handles missing token,
  // or we add more robust error handling above if it doesn't.
  // Consider adding a check and returning NextResponse.json({ error: 'Configuration error' }, { status: 500 });
  accessToken: polarAccessToken!,
  successUrl: absoluteSuccessUrl, // Must be an absolute URL
  // Explicitly use the sandbox environment based on setup
  // Omit or set to 'production' for live mode
  server: "sandbox",
});
