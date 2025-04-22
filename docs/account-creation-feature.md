# Feature Documentation: Optional Account Creation & Analysis Linking (Anonymous Plugin Approach)

## 1. Feature Overview

This feature introduces an optional user account system using Better Auth, allowing users to save their completed color analyses after the initial anonymous flow. It uses the **Better Auth Anonymous Plugin** to seamlessly link analyses created anonymously to a permanent user account upon signup or login. This approach aims to improve user retention and experience by providing persistent access to results without requiring upfront registration.

The core flow: User pays -> **(Anonymous user session created)** -> Uploads Selfie -> Answers Questionnaire -> Receives Analysis (linked to anonymous user ID). After the analysis is displayed, the user is presented with an option to create a permanent account (or log in). If they do, Better Auth's linking mechanism transfers ownership of the analysis from the anonymous ID to the permanent ID.

## 2. User Flow

1.  **Payment:** User starts analysis, pays via Stripe.
2.  **Anonymous Session:** Upon successful payment confirmation, the application automatically signs the user in anonymously using `betterAuth.signIn.anonymous()`. An anonymous user record (`isAnonymous: true`) is created, and an authenticated session begins.
3.  **Analysis Process:** User completes selfie upload and questionnaire while authenticated as the anonymous user.
4.  **Analysis Creation & Storage:** The backend completes the analysis and creates a record in the `analyses` table, **setting the `userId` field to the ID of the currently authenticated anonymous user.**
5.  **Results Display:** User lands on the `/analysis/[analysisId]` page. The analysis is displayed.
6.  **Save Option:**
    - If the user is logged in as an anonymous user (`session.user.isAnonymous`), a "Create Account to Save Analysis" button is shown.
    - If the user is logged in with a permanent account (e.g., navigated back to an old anonymous analysis URL after logging in separately), no button is needed as linking happens automatically on login if the session matches. (This edge case depends on Better Auth session behavior).
    - If the analysis `userId` is already linked to a _permanent_ user, no save button is shown.
7.  **Account Creation/Login (Upgrade):**
    - Clicking "Create Account" initiates the standard Better Auth signup flow (e.g., email/password).
8.  **Automatic Linking (`onLinkAccount` Hook):**
    - Because the signup/login was initiated while authenticated as an anonymous user, Better Auth automatically triggers the backend `onLinkAccount({ anonymousUser, newUser })` hook upon successful authentication.
    - **Your code within this hook updates the database:** `UPDATE analyses SET userId = newUser.id WHERE userId = anonymousUser.id;`
    - Better Auth deletes the original anonymous user record by default.
9.  **Confirmation:** The user is now logged in with their permanent account. They are redirected back to the results page or to their profile page. The analysis is now permanently linked.
10. **Profile Access:** Logged-in users can access a `/profile` page listing all analyses linked to their `userId`.

## 3. Technical Approach

- **Authentication Provider:** Better Auth handles user registration, login, session management.
  - **Anonymous Plugin (`@better-auth/plugin-anonymous`):** Used to create temporary anonymous user identities and handle the linking/upgrade to permanent accounts via the `onLinkAccount` hook.
- **Database:** Drizzle ORM interacts with the Supabase PostgreSQL database.
  - `analyses` table (`src/db/schema.ts`): Requires a nullable `userId` column (type depends on Better Auth user ID, likely `text` or `uuid`). This column will hold the anonymous ID initially, then the permanent ID after linking.
  - `users` table (Managed by Better Auth): Requires an `isAnonymous` boolean field (added by the Anonymous Plugin migration).
  - `sessions` table (`src/db/schema.ts`): **Still required** to track the state of the analysis workflow instance (`status`, `imageBlobUrl`, `questionnaireData`, `expiresAt`, `analysisId`), but **does not need `claimToken`**. It might optionally store the `anonymousUserId` if helpful for cleanup or debugging.
- **Linking Mechanism:** Handled internally by Better Auth via the `onLinkAccount` hook when a standard signup/login follows an anonymous session. Requires backend implementation to update the `analyses` table ownership.
- **Frontend:** Updates needed on the payment success confirmation step (to trigger `signIn.anonymous()`), the results page (UI logic for save button), and potentially client-side auth state handling. A new profile page (`/profile/page.tsx`) is required.

## 4. Security Considerations

- Security relies on Better Auth's session management (secure cookies) to correctly identify the anonymous user initiating the upgrade.
- Users sharing the analysis URL cannot claim the analysis because they won't have the original anonymous user's session cookie, preventing the `onLinkAccount` hook from triggering for them.
- The `onLinkAccount` hook runs server-side, securely transferring ownership.

## 5. Mobile Considerations (React Native)

- Use React Native compatible Better Auth client methods.
- The core logic remains the same. Session management relies on Better Auth's handling for native platforms (likely secure storage for tokens/session info). No specific `AsyncStorage` needed _for linking_, unlike the claim token method.

## 6. Implementation Plan (Anonymous Plugin Approach)

---

### Step 1: Setup Better Auth & Anonymous Plugin

- **Install:** Add `@better-auth/next`, `@better-auth/plugin-anonymous`, and client packages.
  ```bash
  pnpm add @better-auth/next @better-auth/plugin-anonymous
  pnpm add @better-auth/client @better-auth/plugin-anonymous/client # Or similar client package names
  ```
- **Environment Variables:** Configure necessary Better Auth variables (`AUTH_SECRET`, etc.).
- **API Route:** Ensure `src/app/api/auth/[...betterauth]/route.ts` exists.
- **Configuration File (`src/lib/auth.ts`):**

  - Add `anonymous` plugin to the `plugins` array.
  - **Implement the `onLinkAccount` callback:**

    ```typescript
    // src/lib/auth.ts
    import { betterAuth } from "@better-auth/next";
    import { anonymous } from "@better-auth/plugin-anonymous";
    import { db } from "@/db"; // Your DB instance
    import { analyses } from "@/db/schema"; // Your schema
    import { eq } from "drizzle-orm";
    // Other imports...

    export const config: BetterAuthConfig = {
      providers: [
        /* Email/Password, etc. */
      ],
      session: { strategy: "database" }, // Example
      plugins: [
        anonymous({
          onLinkAccount: async ({ anonymousUser, newUser }) => {
            console.log(
              `Linking anonymous user ${anonymousUser.id} data to new user ${newUser.id}`
            );
            try {
              // Re-assign analyses from the anonymous user to the new permanent user
              const updateResult = await db
                .update(analyses)
                .set({ userId: newUser.id, updatedAt: new Date() })
                .where(eq(analyses.userId, anonymousUser.id))
                .returning({ updatedId: analyses.id });

              console.log(
                `Re-assigned ${updateResult.length} analyses from user ${anonymousUser.id} to ${newUser.id}`
              );
              // Add any other data migration logic needed here (e.g., cart items)
            } catch (error) {
              console.error(
                "Error migrating data during account linking:",
                error
              );
              // Consider how to handle errors - should the linking fail?
              // Throwing an error here might prevent the account linking.
            }
          },
          // emailDomainName: "anon.myseason.app" // Optional: customize anon email domain
          // disableDeleteAnonymousUser: false // Default is false (deletes anon user)
        }),
      ],
      // adapter: DrizzleAdapter(db), // If needed
      // Other config...
    };

    export const { GET, POST } = BetterAuth(config); // Export handlers if needed in route.ts
    // Potentially export an auth() helper function
    export const { auth } = betterAuth(config);
    ```

- **Auth Provider Component:** Wrap `src/app/layout.tsx` with Better Auth session provider if needed.
- **Auth Client (`src/lib/auth-client.ts` or similar):** Configure the client instance with `anonymousClient`.

  ```typescript
  // src/lib/auth-client.ts
  import { createAuthClient } from "@better-auth/client";
  import { anonymousClient } from "@better-auth/plugin-anonymous/client"; // Adjust path if needed

  export const authClient = createAuthClient({
    plugins: [anonymousClient()],
  });
  ```

### Step 2: Modify Database Schema & Migrate

- **Edit Schema (`src/db/schema.ts`):**

  - Ensure `analyses` table has a nullable `userId` column (type `text` or matching Better Auth user ID type). Add foreign key reference if Better Auth schema is managed in the same place.
  - **Remove** the `claimToken` column from the `sessions` table if it was added previously.
  - Better Auth migration will add the `isAnonymous` field to its `users` table.
  - **run migration**: `npx drizzle-kit push`

  ```

  ```

### Step 3: Initiate Anonymous Session & Store User ID

- **Modify Payment Confirmation Flow (Client-side, e.g., `/payment-success/page.tsx`):**
  - After verifying successful payment with the backend:
  - Call `await authClient.signIn.anonymous();`
  - Get the session state (e.g., using a Better Auth client hook `useSession` or refetching). Ensure the user is now authenticated anonymously.
  - Proceed with redirecting to the selfie upload step (`/analysis/[sessionId]/upload`).
- **Modify `POST /api/v1/analysis/[sessionId]/start/route.ts`:**
  - When creating the final record in the `analyses` table:
    - Get the currently authenticated user ID from the Better Auth session context on the server (using `auth()` helper from `src/lib/auth.ts`).
    - Set `analyses.userId` to this authenticated user ID (which will be the anonymous user's ID at this point).

### Step 4: Update Frontend Results Page (`/analysis/[analysisId]/page.tsx`)

- **Fetch Data:** Fetch analysis data including `userId`.
- **Get Auth State:** Use Better Auth client hooks (`useSession` or similar) to get `session`.
- **Component Logic:**
  - Determine `isLoggedIn = !!session`.
  - Determine `isAnonymousUser = session?.user?.isAnonymous === true`.
  - Determine `isAnalysisOwnedByAnonymous = !!analysis.userId && isAnonymousUser;` // Or check if analysis.user.isAnonymous
  - Render buttons:
    - If `isAnonymousUser` and the analysis `userId` matches `session.user.id`, show "Create Account to Save".
    - (Optional: If `isLoggedIn` but _not_ anonymous, and analysis `userId` points to an _anonymous_ user, potentially show "Login detected - Account linking may happen automatically" or similar info, though this state might be transient).
    - If analysis `userId` points to a permanent user, show nothing.
- **Button Handlers:**
  - **"Create Account":** Trigger standard Better Auth signup flow (e.g., navigate to `/auth/signup` or show a signup modal). No extra parameters needed.

### Step 5: Implement Profile Page

- **Create Route:** `src/app/profile/page.tsx`.
- **Protect Route:** Use Better Auth middleware or check session server-side. Redirect if unauthenticated.
- **Fetch Data:** Get logged-in `userId`. Fetch analyses where `analyses.userId` matches.
- **Display:** Show list of analyses linked to the permanent user.

### Step 6: Testing

- **Anonymous Flow:** Test Start -> Pay -> (`signIn.anonymous` triggers) -> Upload -> Questionnaire -> Results (analysis created with anonymous `userId`).
- **Linking Flow (Signup):** From results page, click "Create Account" -> Sign up -> Verify `onLinkAccount` runs -> Verify `analyses.userId` is updated to permanent ID -> Verify profile page shows the analysis.
- **Linking Flow (Login):** Sign in anonymously -> Get analysis -> Log out -> Log back in with permanent account (if Better Auth links on login) -> Verify `onLinkAccount` runs -> Verify analysis linked. OR: Sign in anonymously -> Get analysis -> Click "Login" -> Log in with existing permanent account -> Verify `onLinkAccount` runs -> Verify analysis linked. (Test exact flow based on Better Auth behavior).
- **Shared Link:** User A gets analysis (owned by `anonymousUser_A`). User B visits URL -> User B signs up -> Verify `onLinkAccount` _does not_ run for User A's data -> Verify analysis still belongs to `anonymousUser_A` (or `permanentUser_A` if A linked later).
- **Database State:** Verify `analyses.userId` updates correctly. Verify anonymous user record is deleted (default) or kept (if configured) after linking.
- **Cleanup:** Consider strategy/test for cleaning up old, unlinked anonymous user records in the `users` table.

---
