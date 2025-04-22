# PRD: AI Personal Color Analysis App

## 1. Product overview

### 1.1 Document title and version

- PRD: AI Personal Color Analysis App
- Version: 1.2 (Optional Accounts Update)

### 1.2 Product summary

This document outlines the requirements for the "AI Personal Color Analysis App" (Working Title: MySeason). The application provides users with an accurate and personalized color and seasonal analysis derived from a user-uploaded selfie and answers to a brief questionnaire. It leverages Computer Vision (CV) via Google Cloud Vision API, `sharp` for image processing, and a Large Language Model (LLM) via Vercel AI SDK.

The initial product is a web application built with Next.js. Users can complete the entire analysis flow anonymously. Upon receiving their results, users have the **option** to create an account using Better Auth to save their analysis for future access via a profile page. This approach balances low initial friction with the benefit of persistent results for registered users. The backend API layer is designed for reusability to support a potential future mobile application (React Native/Expo). The core analysis utilizes a pay-per-analysis model, focusing on user-friendliness, privacy, and generating a shareable "Personal Card".

## 2. Goals

### 2.1 Business goals

- Validate the market demand and technical feasibility of AI-driven personal color analysis.
- Generate revenue through a one-time fee per analysis model.
- Encourage user retention and repeat usage through optional account creation and saved analysis history.
- Achieve organic growth through the shareable "Personal Card" feature.
- Establish a foundation (reusable API, user base) for future expansion into a mobile application and potential new features.

### 2.2 User goals

- Receive an accurate, personalized, and actionable color/seasonal analysis quickly and conveniently, **without needing an account initially**.
- Understand which colors complement their natural features (skin, eyes, hair).
- Get practical advice on clothing, makeup (if applicable), hair color, and accessories based on their analysis.
- Have a simple and private initial user experience.
- **Optionally create an account to easily save and revisit their analysis results.**
- Obtain a visually appealing summary ("Personal Card") of their results that they can save and share.

### 2.3 Non-goals

- Requiring user accounts _before_ completing an analysis in the initial flow.
- Storing user input data (selfies, questionnaire answers) permanently beyond the analysis process, **unless explicitly saved to a user account where applicable policies allow.**
- Providing complex styling advice beyond color coordination (e.g., body shape analysis, specific garment recommendations).
- Building a social network or community features within the MVP.
- Developing the mobile application during the initial phase (focus on web first).
- Implementing features requiring recurring subscriptions in the MVP.

## 3. User personas

### 3.1 Key user types

- **Style Curious Individuals:** Users interested in improving their personal style, fashion choices, or makeup application but unsure about their best colors.
- **DIY Enthusiasts:** Users who prefer self-service tools over potentially expensive in-person consultations.
- **Social Sharers:** Users who enjoy sharing personalized results and insights online.
- **Registered Users:** Users who create an account to save and track their analysis history.

### 3.2 Basic persona details

- **Alex (Style Curious):** Mid-20s, completes an analysis anonymously, loves the results, and decides to create an account to save it.
- **Jamie (DIY Enthusiast):** 30s-40s, completes an analysis, finds it useful, and appreciates being able to save it to their profile for later reference when shopping.
- **Casey (Social Sharer):** Early 20s, completes analysis, downloads the card to share, and creates an account to keep the result.

### 3.3 Role-based access

- **Anonymous User:** Can initiate an analysis, pay, provide input, and view/download their results using a unique analysis ID during their active session. **An anonymous user identity is created post-payment, linked to the analysis.**
- **Registered User:** Can do everything an Anonymous User can, plus: create an account (upgrading their anonymous session), log in, **have completed analyses automatically linked via the `onLinkAccount` mechanism during signup/login**, view their saved analyses on a profile page.

## 4. Functional requirements

- **Payment Integration** (Priority: High)
  - [x] Redirect user to Stripe upon starting a new analysis.
  - [x] Securely process one-time payments.
  - [x] Receive and validate payment confirmation via webhooks.
  - [x] Handle payment failures gracefully.
- **Selfie Upload & Capture** (Priority: High)
  - [ ] Provide clear instructions for selfie quality.
  - [ ] Offer QR code flow for desktop users.
  - [ ] Implement direct browser camera access (`getUserMedia`).
  - [ ] Display camera overlay guide.
  - [ ] Allow photo preview.
  - [x] Temporarily store uploaded photo linked to the paid session (`sessions` table).
- **Image Quality Validation** (Priority: High)
  - [x] Utilize Google Cloud Vision API (`FACE_DETECTION`).
  - [x] Check for exactly one face.
  - [x] Validate confidence and likelihood thresholds.
  - [x] Provide specific user feedback on failure and allow re-upload.
  - [x] Delete temporary image blob on validation failure.
- **Questionnaire** (Priority: High)
  - [x] Present a short (<10 questions) form after successful image validation.
  - [x] Gather data for personalization.
  - [x] Temporarily store answers linked to the session (`sessions` table).
- **Backend Analysis Pipeline** (Priority: High)
  - [ ] Retrieve landmarks from Vision API response.
  - [ ] Use `sharp` to extract color regions around landmarks.
  - [ ] Calculate average colors (HEX/RGB).
  - [ ] Combine colors and questionnaire answers into structured input.
  - [x] Invoke LLM (via Vercel AI SDK) requesting structured JSON output.
  - [x] **Crucially, this entire pipeline must be exposed via a well-defined API endpoint suitable for consumption by both web and future mobile clients.**
- **Result Generation and Storage** (Priority: High)
  - [x] Generate a unique analysis ID (UUID v4) upon successful LLM response.
  - [x] **Authenticate user anonymously post-payment (`signIn.anonymous()`).**
  - [x] Store the complete LLM analysis result (`JSONB`) in the `analyses` table, **setting `userId` to the current anonymous user ID.**
  - [ ] Delete temporary input data (photo blob, answers in session) after processing or expiry.
- **Result Display** (Priority: High)
  - [x] Redirect user to a unique results page (`/analysis/[analysisId]`).
  - [x] Render the full analysis content from the database based on the ID.
  - [x] Display the unique analysis ID clearly.
  - [x] Provide a "Copy ID" button.
  - [x] **Offer options to "Create Account" or "Log In" if the user is currently anonymous.**
- **Account Creation / Login & Linking (New)** (Priority: High)
  - [ ] Integrate Better Auth for user authentication (signup, login, session management) **including the Anonymous Plugin.**
  - [ ] Provide UI elements on the results page for "Create Account to Save" or "Log In" if the user is authenticated anonymously.
  - [ ] Trigger standard Better Auth signup/login flows when buttons are clicked.
  - [ ] **Implement the `onLinkAccount({ anonymousUser, newUser })` hook in the Better Auth backend configuration.**
  - [ ] **Inside `onLinkAccount`, update the `analyses` table: `SET userId = newUser.id WHERE userId = anonymousUser.id`.**
  - [ ] (Better Auth handles deleting the anonymous user record by default).
- **User Profile Page (New)** (Priority: High)
  - [ ] Create a route (`/profile`) accessible only to logged-in users.
  - [ ] Display a list of analyses linked to the current user's ID, fetched from the `analyses` table.
  - [ ] Provide links to view each saved analysis.
- **Personal Card Generation & Download** (Priority: High)
  - [ ] Generate a visually appealing summary image (PNG/JPG).
  - [ ] Implement generation (client-side `html2canvas` or server-side).
  - [ ] Provide a button to download the generated card.
- **Retrieve Previous Analysis** (Priority: Medium - Primarily for anonymous/unclaimed)
  - [ ] Provide an input field on the homepage to enter a previously saved analysis ID.
  - [ ] Query the backend API to find the analysis by ID.
  - [ ] Redirect to the results page if found, show error if not found. (Note: Logged-in users primarily use the Profile page).

## 5. User experience

### 5.1. Entry points & first-time user flow

- User lands on the homepage. Clear CTA "Start New Analysis".
- Clicking "Start" initiates payment.
- Post-payment: Guided selfie upload -> quality check -> questionnaire -> analysis generation (loading indicators).
- Results page: Clear presentation, emphasis on the analysis ID, and **prominent options to "Download Card" and "Create Account to Save" (or "Save to Account" if logged in).**

### 5.2. Core experience

- **Payment**: Quick, secure, standard flow.
- **Selfie Upload**: Simple, guided, immediate feedback. QR code option for desktop.
- **Questionnaire**: Short, clear, minimal typing.
- **Analysis Wait**: Visual feedback during processing.
- **Results**: Well-structured, readable, actionable advice, clear color visuals.
- **Account Creation (Optional):** Seamless transition to signup/login if chosen. Clear benefit explained (saving results).
- **Profile Page:** Simple list of saved analyses for logged-in users.

### 5.3. Advanced features & edge cases

- **QR Code Flow**: Handle connection loss/navigation issues.
- **Multiple Faces/Poor Quality**: Specific, helpful error messages; easy re-attempts.
- **Analysis Errors**: Graceful handling, inform user, suggest retry, log errors.
- **ID Retrieval**: Handle typos/invalid IDs for anonymous retrieval.
- **Anonymous Linking:** Ensure `signIn.anonymous` is called correctly post-payment. Verify the `onLinkAccount` hook reliably transfers analysis ownership. Handle potential errors during data migration in the hook.
- **Session Management:** Understand Better Auth's anonymous session duration and how it interacts with users returning later.
- **Linking Issues:** Monitor `onLinkAccount` execution. Ensure anonymous user deletion doesn't cause issues if data migration fails.

### 5.4. UI/UX highlights

- Clean, modern, visually appealing interface (style/fashion theme).
- Mobile-first responsive design.
- Smooth transitions and micro-interactions.
- Excellent readability.
- Clear visualization of color palettes.
- Beautifully designed, shareable "Personal Card".
- **Non-intrusive prompt to create an account after value is delivered.**

## 6. Narrative

Alex, keen to refine their professional look, discovers MySeason. They appreciate the immediate analysis flow without signup. After paying and providing a selfie/answers, they receive their "Soft Autumn" analysis. Impressed, Alex downloads the "Personal Card" to share and then **clicks "Create Account"** on the results page. After a quick signup, the analysis is automatically saved to their new profile. Later, Alex logs in to review the advice before a shopping trip.

## 7. Success metrics

### 7.1. User-centric metrics

- Analysis Completion Rate (Successful Payment to Result Display).
- "Personal Card" Download Rate.
- **Account Creation Rate (Post-Analysis).**
- **Analysis Linking Success Rate.**
- **Login Rate / Profile Page Visits.**
- Rate of successful image quality validation.

### 7.2. Business metrics

- Number of Analyses Purchased.
- Conversion Rate (Homepage visitors to Paid Analyses).
- Revenue Generated.
- User Retention Rate (for registered users).
- Organic traffic/mentions driven by shared cards.

### 7.3. Technical metrics

- API Response Times (Vision API, LLM, Database, Auth).
- Image Processing Time (`sharp`).
- API Error Rates (Vision, LLM, Payment, Database, Auth, Linking).
- Server Uptime / Application Availability.

## 8. Technical considerations

### 8.1. Integration points

- Payment Provider API (Stripe) - Webhooks.
- Google Cloud Vision API - Key management, error handling.
- LLM Provider API (via Vercel AI SDK) - Key management, prompt engineering, response validation.
- Image Processing Library (`sharp`) - Server-side execution.
- **Authentication Provider (Better Auth)** - API routes, configuration, user/session management, client-side integration.
- Database (Supabase/PostgreSQL) - Drizzle ORM.

### 8.2. Data storage & privacy

- **Analyses Table:** Stores final analysis results (`JSONB`), linked to a non-identifiable UUID (`id`), **and linked via `userId` (nullable foreign key) first to an anonymous user, then potentially updated to a permanent user ID.**
- **Sessions Table:** Stores temporary state (`status`, `paymentIntentId`, `imageBlobUrl`, `questionnaireData`, `expiresAt`), the final `analysisId`. **(No `claimToken` needed).** May store anonymous `userId` for reference.
- **Users/Accounts Tables:** Managed by Better Auth, storing user credentials, profile info, **and an `isAnonymous` flag.**
- **Temporary Data:** User-uploaded photos (blobs) and questionnaire answers (`sessions` table fields) must be stored securely _only_ for the duration needed and reliably deleted/nullified afterwards. **Anonymous user records are typically deleted by Better Auth upon linking.** Strategy needed for orphaned anonymous users.
- **Compliance:** Ensure compliance with relevant data privacy regulations (GDPR, CCPA). Clear privacy policy detailing data handling for both anonymous and registered users.

### 8.3. Scalability & performance

- Utilize serverless functions (Vercel) for backend API endpoints.
- Optimize database queries (indexing `id`, `userId` in `analyses`).
- Monitor performance of external API calls (Vision, LLM, Auth).
- Consider response streaming for LLM results.
- Ensure efficient image handling.
- Scale authentication infrastructure as needed (consider Better Auth's database usage, **especially anonymous user cleanup**).

### 8.4. Potential challenges

- **Color Accuracy:** Consistency of color extraction under varying lighting conditions.
- **LLM Reliability & Cost:** Consistent quality/structure from LLM; managing API costs.
- **Prompt Engineering:** Developing effective prompts.
- **Payment Flow Complexity:** Securely handling redirects and webhooks.
- **Anonymous Linking Logic:** Correctly implementing the `onLinkAccount` data migration and handling potential edge cases or errors within it.
- **Orphaned Data:** Managing and cleaning up old anonymous user records and potentially associated (but never linked) analyses if necessary.
- **Integration Complexity:** Integrating the `signIn.anonymous` call at the right point and ensuring session context is available for analysis creation.

## 9. Milestones & sequencing

### 9.1. Project estimate

- **MVP (Account-less):** 4-6 weeks (Completed)
- **Feature (Optional Accounts):** 1-2 weeks (Following MVP)

### 9.2. Team size & composition

- Small Team: 1-2 total people
  - 1-2 Full-stack Developers (experienced with Next.js, API integrations, auth).

### 9.3. Suggested phases

- **Phase 1: Backend Core & API Setup (MVP - Completed)**
- **Phase 2: Core Analysis Pipeline (MVP - Completed)**
- **Phase 3: Frontend UI & User Flow (MVP - Completed)**
- **Phase 4: Polishing & Testing (MVP - Completed)**
- **Phase 5: Account Feature - Backend (1 week)**
  - Key deliverables: [ ] Integrate Better Auth + Anonymous Plugin, [ ] update DB schema (`analyses.userId`), [ ] implement `onLinkAccount` hook logic, [ ] adjust analysis creation to use auth context.
- **Phase 6: Account Feature - Frontend (1 week)**
  - Key deliverables: [ ] Implement `signIn.anonymous` call post-payment, [ ] update results page UI (buttons triggering standard auth), [ ] create profile page, [ ] integrate Better Auth client hooks/session handling.
- **Phase 7: Account Feature - Testing (Ongoing)**
  - Key deliverables: [ ] Thorough end-to-end testing of anonymous session creation, account upgrade/linking, profile scenarios.

## 10. User stories

### 10.1. Start a new analysis

- **ID**: US-001
- **Description**: As an anonymous user, I want to start the color analysis process so that I can get my personalized results.
- **Acceptance Criteria**:
  - The homepage displays a clear "Start New Analysis" button.
  - Clicking the button initiates the payment flow.

### 10.2. Pay for analysis

- **ID**: US-002
- **Description**: As an anonymous user, I want to securely pay the one-time fee so that I can proceed with the analysis.
- **Acceptance Criteria**:
  - User is redirected to the payment provider's checkout page.
  - Payment details are handled securely by the provider.
  - Upon successful payment confirmation (via webhook), the user is redirected to the selfie upload step.
  - Upon payment failure, the user is redirected back with an error message.

### 10.3. Upload selfie (Mobile/QR Flow)

- **ID**: US-003
- **Description**: As an anonymous user on mobile (or via QR code), I want to easily take and upload a selfie using my phone's camera, guided by an overlay, so that the app can analyze it.
- **Acceptance Criteria**:
  - Camera access is requested and activated in the browser.
  - A visual overlay guide is displayed over the camera feed.
  - User can take a photo.
  - User can preview the photo.
  - User can upload the photo.
  - The photo is sent to the backend.

### 10.4. Use QR code for upload (Desktop Flow)

- **ID**: US-004
- **Description**: As an anonymous user on desktop, I want to be presented with a QR code to scan with my phone so that I can use my phone's camera for a better quality selfie.
- **Acceptance Criteria**:
  - If on desktop, selfie page shows instructions and a unique QR code.
  - Scanning the QR code opens the mobile selfie upload page (US-003) on the phone.
  - The photo uploaded via the phone is correctly linked to the original desktop session.
  - Desktop page updates or proceeds once the mobile upload is complete.

### 10.5. Receive feedback on image quality

- **ID**: US-005
- **Description**: As an anonymous user, I want to receive immediate feedback if my uploaded selfie is unsuitable for analysis (e.g., too dark, blurry, no face, multiple faces) so that I can upload a better one.
- **Acceptance Criteria**:
  - Backend performs quality checks using Vision API results (`confidence`, `likelihoods`, face count).
  - If checks fail, a specific error message is displayed to the user (e.g., "Image too blurry, please try again").
  - The user is prompted to re-upload the selfie (returns to US-003/US-004).
  - If checks pass, the user proceeds to the questionnaire.

### 10.6. Answer questionnaire

- **ID**: US-006
- **Description**: As an anonymous user, I want to answer a short questionnaire after my selfie is approved so that the analysis can be further personalized.
- **Acceptance Criteria**:
  - A form with 5-10 clear questions is displayed.
  - Questions cover gender preference, age range, personality keywords, and context.
  - User can easily select/input answers.
  - Submitting the form sends answers to the backend.
  - User sees a loading/processing indicator for the main analysis.

### 10.7. View analysis results

- **ID**: US-007
- **Description**: As an anonymous user, after the analysis is complete, I want to view my detailed results on a dedicated page so that I can understand my color season and recommendations **and decide if I want to save it**.
- **Acceptance Criteria**:
  - User is directed to a unique URL (`/analysis/[analysisId]`).
  - The page displays all sections generated by the LLM.
  - Content is well-formatted and readable. Color palettes are visually displayed.
  - **If the analysis is not linked to an account, options to "Create Account" or "Save to Account" (if logged in) are clearly presented.**

### 10.8. Receive and save unique analysis ID

- **ID**: US-008
- **Description**: As an anonymous user, I want to receive a unique ID for my analysis results so that I can potentially view them again later **if I don't create an account**.
- **Acceptance Criteria**:
  - The unique analysis ID (UUID) is clearly displayed on the results page.
  - A "Copy ID" button allows easy copying.
  - A message advises the user they can save the ID/URL **or create an account for easier access.**

### 10.9. Download personal card

- **ID**: US-009
- **Description**: As an anonymous user, I want to download a visually appealing summary card ("Personal Card") of my analysis so that I can easily save, reference, and share my results.
- **Acceptance Criteria**:
  - A "Download Card" button is present on the results page.
  - Clicking the button initiates the download of a summary image (PNG/JPG).
  - The card contains key information (e.g., season name, top colors, metal tones) in an attractive layout.

### 10.10. Retrieve previous analysis using ID

- **ID**: US-010
- **Description**: As an anonymous user who saved my analysis ID, I want to enter this ID on the homepage to retrieve and view my previous results **if I chose not to create an account.**
- **Acceptance Criteria**:
  - Homepage has an option "View Previous Analysis" leading to an input field.
  - User can enter a UUID. Submitting queries the backend.
  - If the ID exists and is **not linked to a user account (or handling allows anonymous view)**, redirect to the results page.
  - If ID does not exist or access rules prevent viewing, show an error.

### 10.11. Create account after analysis

- **ID**: US-011
- **Description**: As an anonymous user viewing my results, I want to create an account so that my analysis is automatically saved and linked to my profile for easy future access.
- **Acceptance Criteria**:
  - A "Create Account" button is visible on the results page if the user is authenticated anonymously.
  - Clicking the button initiates the standard Better Auth signup flow.
  - Upon successful signup, the `onLinkAccount` hook is triggered automatically because the user was previously anonymous.
  - The hook updates the `analyses` table, transferring ownership from the anonymous ID to the new permanent ID.
  - The user is redirected to the results page (now potentially indicating "Saved") or their profile page.

### 10.12. Log in to save analysis

- **ID**: US-012
- **Description**: As an anonymous user viewing my results, I want to log in to an existing permanent account so that my analysis is automatically saved and linked to that profile.
- **Acceptance Criteria**:
  - A "Log In" button/link is visible on the results page if the user is authenticated anonymously.
  - Clicking initiates the standard Better Auth login flow.
  - Upon successful login, the `onLinkAccount` hook is triggered automatically.
  - The hook updates the `analyses` table, transferring ownership to the permanent user ID.
  - Analysis is linked, user redirected appropriately.

### 10.13. Save analysis while logged in

- **ID**: US-013
- **Description**: As a logged-in user viewing an analysis I just completed (which isn't linked yet), I want to click a button to directly save this analysis to my existing account.
- **Acceptance Criteria**:
  - A "Save to My Account" button is visible if analysis isn't linked but user _is_ logged in.
  - Clicking the button retrieves the `claimToken` from client storage.
  - The backend linking API/Action is called directly with `analysisId` and `claimToken`.
  - Analysis `userId` is updated. User sees confirmation (e.g., button disappears/changes text, toast message).

### 10.14. View saved analyses on profile

- **ID**: US-014
- **Description**: As a registered user, I want to access a profile page where I can see a list of all the analyses I have previously saved.
- **Acceptance Criteria**:
  - A `/profile` route exists and is accessible only after login.
  - The page fetches and displays a list of analyses where `userId` matches the logged-in user.
  - Each item in the list links to the corresponding `/analysis/[analysisId]` page.
  - A message is shown if no analyses have been saved yet.

## 11. Detailed Technical Flow (Updated for Anonymous Plugin)

This section documents the technical flow incorporating the Better Auth Anonymous Plugin.

1.  **Session Initiation (`POST /api/v1/sessions`):**

    - Triggered by the user starting a new analysis.
    - Generates a unique UUID (`sessionId`).
    - Creates a record in the `sessions` database table (`id`, `status: 'pending_payment'`, `expiresAt`).
    - Creates a Stripe Checkout Session, embedding the `sessionId` as `client_reference_id`.
    - Returns the `sessionId` and Stripe `checkoutUrl` to the frontend.

2.  **Payment Confirmation (`POST /api/v1/webhooks/stripe`):**

    - Receives `checkout.session.completed` event from Stripe.
    - Extracts `sessionId` from `client_reference_id`.
    - Updates the corresponding `sessions` record:
      - Sets `status` to `'payment_complete'`.
      - Stores `paymentIntentId`.

3.  **Anonymous Sign-In Trigger (Client-side):**

    - User is redirected to `/payment-success` page.
    - **Client-side logic:** Verifies payment success (e.g., calls backend endpoint `GET /api/v1/sessions/[sessionId]/verify-payment-status`).
    - **If payment verified:** Calls `await authClient.signIn.anonymous();`.
    - Waits for session update or confirms anonymous auth state.
    - Redirects user to the selfie upload step (`/analysis/[sessionId]/upload`).

4.  **Selfie Upload Trigger (Frontend):**

    - User (authenticated anonymously) is on `/analysis/[sessionId]/upload`.
    - `SelfieAnalyzer` handles upload.

5.  **Blob Upload & Authorization (`POST /api/v1/blob/upload`):**

    - Authorizes upload based on `sessionId` and session status (still need `payment_complete` check ideally, maybe also check user is authenticated).

6.  **Image Validation (`POST /api/v1/analysis/validate`):**

    - Validates image via Vision API. On success, updates `sessions` record: sets `imageBlobUrl`, sets status to `'awaiting_questionnaire'`.

7.  **Questionnaire Flow (Frontend):**

    - User fills form on `/analysis/[sessionId]/questionnaire`.

8.  **Questionnaire Submission (`POST /api/v1/analysis/[sessionId]/questionnaire`):**

    - Submits answers. Updates `sessions` record: sets `questionnaireData`, sets status to `'questionnaire_complete'`.

9.  **Analysis Trigger Flow (Frontend -> Backend):**

    - Redirects to processing page (`/analysis/[sessionId]/processing`).
    - Page triggers `POST /api/v1/analysis/[sessionId]/start`.

10. **Analysis Pipeline Execution (`POST /api/v1/analysis/[sessionId]/start`):**

    - Finds session, verifies status `'questionnaire_complete'`.
    - **Gets current authenticated user ID (anonymous ID) using Better Auth server helper `auth()`.**
    - Updates session status to `'analysis_pending'`.
    - Retrieves image URL and questionnaire data.
    - **(Pipeline Steps):**
      - Downloads the image from the blob URL.
      - Performs image analysis using `sharp` (color extraction, etc.).
      - Constructs the prompt for the LLM using `sharp` results and questionnaire data.
      - Calls the LLM API (via Vercel AI SDK).
      - Parses and validates the LLM response.
    - **(On Pipeline Success):**
      - **Creates** record in `analyses` table, setting `result` JSON **and `userId` to the anonymous user ID.** -> gets `analysisId`.
      - **Updates** the `sessions` record: sets `status` to `'analysis_complete'`, links `analysisId`.
    - (On Pipeline Failure): Updates session status to `'analysis_failed'`.

11. **Status Check (`GET /api/v1/analysis/[sessionId]/status`):**

    - Processing page polls this endpoint.
    - Route handler finds session record.
    - If `status` is `'analysis_complete'`, response includes `{ success: true, status: 'analysis_complete', analysisId: session.analysisId }`. **(No `claimToken` needed).**

12. **Result Display (Frontend):**

    - **Processing page:** Receives `'analysis_complete'`, `analysisId`. Redirects to `/analysis/[analysisId]`.
    - **Results page (`/analysis/[analysisId]`):**
      - Fetches analysis data (including `userId`).
      - Checks auth state using Better Auth hooks (`useSession`).
      - **Conditionally renders "Create Account to Save" or login prompts if `session.user.isAnonymous` matches `analysis.userId`.**

13. **Account Creation / Login Trigger (Frontend):**

    - User clicks "Create Account" or "Log In".
    - Triggers standard Better Auth `signUp` or `signIn` flows (e.g., navigate to `/auth/signup`).

14. **`onLinkAccount` Hook Execution (Backend):**

    - Upon successful `signUp`/`signIn` by a previously anonymous user, Better Auth triggers the `onLinkAccount` hook.
    - **Hook code executes:** `UPDATE analyses SET userId = newUser.id WHERE userId = anonymousUser.id;`
    - Better Auth deletes anonymous user record.

15. **Auth Callback Handling / Redirection (Frontend/Better Auth):**

    - After successful signup/login (and `onLinkAccount` completion), Better Auth redirects user based on its config (e.g., back to results page `/analysis/[analysisId]`, or to `/profile`).

16. **Profile Page (`/profile`):**

    - Route protected by authentication.
    - Fetches analyses from `analyses` table where `userId` matches the (now permanent) logged-in user.
    - Displays list with links.

17. **Data Cleanup:**
    - Temporary data (image blob, session questionnaire data) should be cleared/deleted after analysis completion or session expiry.
    - **Orphaned anonymous user records in the `users` table might need periodic cleanup.**
