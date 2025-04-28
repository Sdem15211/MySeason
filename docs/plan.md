# AI Personal Color Analysis App (MySeason) Development Plan

## Overview

The AI Personal Color Analysis App (MySeason) provides users with an accurate and personalized color and seasonal analysis derived from a user-uploaded selfie and a brief questionnaire. It leverages Google Cloud Vision API for facial landmarks, `sharp` for image analysis, and an LLM (OpenAI/Anthropic via Vercel AI SDK) for generating the analysis. The initial MVP is a Next.js web application that allows users to complete the analysis flow anonymously. **An optional account creation feature using Better Auth allows users to save results post-analysis.** The backend API is designed for reusability for a potential future mobile app.

## 1. Project Setup

- [x] **Repository Setup**
  - [x] Initialize Git repository.
  - [x] Setup remote repository (e.g., GitHub, GitLab).
- [x] **Development Environment Configuration**
  - [x] Define required Node.js version (compatible with Next.js 15, React 19).
  - [x] Setup package manager (npm/yarn/pnpm).
  - [x] Configure TypeScript (`tsconfig.json`).
  - [x] Setup linters and formatters (ESLint, Prettier).
- [x] **Database Setup**
  - [x] Create Supabase project.
  - [x] Configure PostgreSQL database access.
  - [x] Setup Drizzle ORM and generate initial configuration.
  - [x] Configure database connection environment variables.
- [x] **Initial Project Scaffolding**
  - [x] Initialize Next.js 15 project (`create-next-app`) with TypeScript and App Router.
  - [x] Setup Tailwind CSS configuration (`tailwind.config.js`, `postcss.config.js`).

## 2. Backend Foundation

- [x] **Database Schema & Migrations (Drizzle ORM)**
  - [x] Define initial database schema for storing analysis results (`analyses` table with UUID `id` and `JSONB` `result` field).
  - [x] Define schema for tracking session state (`sessions` table).
  - [x] Generate initial Drizzle migration files.
  - [x] Setup Drizzle Kit for managing migrations.
- [x] **Session Management (Account-less)**
  - [x] Design strategy for tracking user sessions across payment and analysis steps (using `sessions` table).
  - [x] Implement secure temporary storage mechanism for session data (via `sessions` table).
- [x] **Core Services & Utilities**
  - [x] Implement utility for generating unique IDs (UUID v4).
  - [x] Setup client for Google Cloud Vision API.
  - [x] Setup client for Vercel AI SDK (configured for Google Gemini).
  - [x] Setup client for Supabase database interactions using Drizzle.
  - [ ] Implement secure API key management (environment variables, secrets manager). (Deferred)
  - [x] Implement robust error handling and logging framework. (Basic try/catch + console logging implemented in utils & API routes; Robust framework deferred)
- [x] **Base API Structure (Next.js API Routes/Route Handlers)**
  - [x] Define base API route structure (e.g., `/api/v1/...`).
  - [x] Implement base request/response handling and validation middleware. (Basic handling in routes; Zod validation for questionnaire)
  - [x] **Design API contracts with future mobile app reusability in mind.** (Implemented via defined routes)

## 3. Feature-specific Backend

- [x] **Payment Integration (Stripe)**
  - [x] API endpoint (`/api/v1/sessions`) to initiate payment checkout session.
    - [x] Generate payment intent/session with the provider.
    - [x] Return checkout URL/ID to the frontend.
    - [x] Store temporary payment session details (in `sessions` table).
  - [x] API endpoint (`/api/v1/webhooks/stripe`) to handle payment confirmation.
    - [x] Securely validate webhook signature.
    - [x] Update internal session state (`sessions` table) upon successful payment.
    - [x] Handle payment failures/cancellations (basic logging).
- [x] **Selfie Upload & Validation**
  - [x] API endpoint (`/api/v1/blob/upload`) for Vercel Blob authorization.
    - [x] Implement secure temporary storage for the uploaded image linked to the session ID/payment ID (via `sessions` table update in `/validate`).
    - [x] Validate session status (`payment_complete`).
  - [x] API endpoint (`/api/v1/analysis/validate`) for image validation.
    - [x] Integrate Google Cloud Vision API (`FACE_DETECTION`).
    - [x] Call Vision API with the uploaded image.
    - [x] Process response to check face count (exactly 1).
    - [x] Validate `detectionConfidence`, `landmarkingConfidence`, `underExposedLikelihood`, `blurredLikelihood` against defined thresholds.
    - [x] Return structured validation result (success/failure with specific reasons) and landmarks if successful.
    - [x] Update session status to `awaiting_questionnaire` and store `uploadedImagePath`.
    - [x] Implement logic to delete temporary image blob if validation fails.
- [x] **Questionnaire Handling**
  - [x] API endpoint (`/api/v1/analysis/[sessionId]/questionnaire`) to receive questionnaire answers.
  - [x] Implement secure temporary storage for answers linked to the session ID (in `sessions` table `questionnaireData` column).
  - [x] Validate submitted answers (using Zod schema `src/lib/schemas/questionnaire.ts`).
  - [x] Update session status to `questionnaire_complete`.
- [x] **Backend Analysis Pipeline (Core Logic)**
  - [x] API endpoint (`/api/v1/analysis/[sessionId]/start`) to trigger the main analysis process.
  - [x] Retrieve `uploadedImagePath` and `questionnaireData` from temporary storage (`sessions` table).
  - [x] Update session status to `analysis_pending`.
  - [x] Load temporary image file.
  - [x] Integrate `sharp` library for image processing.
    - [x] Extract image regions around key landmarks (eyes, cheeks, forehead/eyebrows).
    - [x] Calculate average color (HEX/RGB) for each region.
  - [x] Integrate Vercel AI SDK (Configured for Gemini).
    - [x] Construct detailed prompt including extracted colors, questionnaire answers, and desired JSON output structure (season, palettes, advice sections). // Using placeholder colors
    - [x] Handle LLM API call, including potential streaming and error handling. // Basic call implemented
    - [x] Parse and validate the structured JSON response from the LLM. // Basic parsing
  - [x] Generate unique analysis UUID (in `/start` route).
- [x] **Result Storage & Cleanup**
  - [x] Store the validated LLM analysis result (JSONB) in the Supabase `analyses` table using Drizzle, linked to the unique UUID.
  - [x] Update session status to `analysis_complete` and link `analysisId`.
  <!-- - [ ] Implement robust deletion of all temporary data (image file, questionnaire answers, session data) after successful storage.  -->
- [x] **Result Retrieval**
  - [x] API endpoint `GET /api/v1/analysis/[analysisId]` to retrieve analysis results.
  - [x] Query Supabase/Drizzle using the provided UUID.
  - [x] Return the stored analysis JSON or a 404 error if not found.

## 4. Frontend Foundation

- [x] **UI Framework Setup (Next.js 15 / React 19)**
  - [x] Establish core layout components (`src/app/layout.tsx`).
  - [x] Implement basic styling with Tailwind CSS.
  - [x] Setup TypeScript interfaces/types for shared data structures (`src/lib/schemas`).
- [x] **Component Library**
  - [x] Design and implement base UI components (Buttons, Inputs, Modals, Loading Spinners, etc.) using Tailwind CSS & Shadcn UI.
  - [x] Ensure components are reusable and adhere to a consistent style guide.
- [x] **Routing System (Next.js App Router)**
  - [x] Define application routes (Homepage `/`, `/analysis/[sessionId]/...`, `/analysis/[analysisId]/...`).
  - [x] Implement navigation between pages (`useRouter`, `Link`).
- [x] **State Management**
  - [x] Choose and implement a state management solution (Using basic `useState` and `useRef` where needed).
- [x] **Base UI Elements**
  - [ ] Implement Header/Footer components.
  - [x] Implement basic error display components (within components, using `toast`).

## 5. Feature-specific Frontend

- [x] **Homepage (`src/app/page.tsx`)**
  - [x] Implement "Start New Analysis" button triggering payment initiation API call.
  - [ ] Implement "View Previous Analysis" section with input field and button.
    - [ ] Add logic to call retrieval API and navigate on success, show error on failure.
- [x] **Payment Flow UI**
  - [x] Handle redirection to Stripe checkout page.
  - [x] Implement UI for handling return URLs (success: `src/app/payment-success/page.tsx`).
- [x] **Selfie Upload UI (`src/components/features/analysis/selfie-analyzer.tsx`)**
  - [x] Create dedicated page/component for selfie upload instructions.
  - [x] **Desktop Flow:**
    - [x] Implement QR code generation (e.g., `react-qr-code`) linked to a unique session identifier.
    - [x] Implement mechanism to check for completion from the mobile flow (e.g., WebSocket, polling).
  - [x] **Mobile/QR Flow:**
    - [x] Implement camera access using `getUserMedia`.
    - [ ] Implement camera overlay guide (HTML/CSS/SVG).
    - [x] Implement capture, preview, and upload logic.
  - [x] Send image file to the backend upload endpoint.
- [x] **Image Quality Feedback UI**
  - [x] Display specific error messages based on backend validation response (via `toast` in `SelfieAnalyzer`).
  - [x] Provide a clear "Try Again" button to re-initiate the upload flow (implicit via file input).
- [x] **Questionnaire Form UI (`src/app/analysis/[sessionId]/questionnaire/...`)**
  - [x] Implement form using React Hook Form or similar library.
  - [x] Render questions based on defined structure.
  - [x] Handle form submission to the backend questionnaire endpoint.
- [x] **Analysis Loading UI (`src/app/analysis/[sessionId]/processing/...`)**
  - [x] Display visual feedback (progress steps, animation) while the backend analysis pipeline runs.
  - [x] Handle potential timeouts or errors from the analysis endpoint.
- [x] **Results Page (`/analysis/result/[analysisId]/page.tsx`)**
  - [x] Implement dynamic route to fetch analysis data based on URL ID.
  - [x] Render all sections of the analysis result (Season, Palettes, Advice) in a readable format.
  - [x] Implement visual display for color palettes (swatches).
  - [x] Display the unique analysis ID prominently.
  - [x] Implement "Copy ID" button functionality. (`src/components/features/analysis/copy-button.tsx`)
- [ ] **Personal Card Generation & Download UI**
  - [ ] Design the "Personal Card" layout (HTML/CSS).
  - [ ] Implement generation logic:
    - [ ] **Option A (Client-side):** Use `html2canvas` to capture the card component as an image.
    - [ ] **Option B (Server-side):** Create an API endpoint that uses `sharp` or a headless browser (e.g., Puppeteer/Playwright on a serverless function) to generate the image (more complex setup). Decide approach.
  - [ ] Implement "Download Card" button to trigger image generation and download.

## 6. Integration

- [x] Connect "Start New Analysis" button to backend payment initiation endpoint.
- [x] Integrate payment provider success/failure callbacks to navigate the user flow.
- [x] Connect selfie upload component to backend upload endpoint.
- [x] Integrate backend image validation response into the frontend feedback loop.
- [x] Connect questionnaire form submission to the backend endpoint.
- [x] Trigger backend analysis pipeline endpoint after questionnaire submission.
- [x] Poll backend analysis completion and retrieve the unique analysis ID.
- [x] Navigate user to the results page (`/analysis/result/[analysisId]`) upon completion.
- [x] Connect results page data fetching to the backend retrieval endpoint.
- [x] Test the end-to-end QR code flow synchronization between desktop and mobile contexts.

## 7. Testing

- [ ] **Unit Testing (Jest/Vitest)**
  - [x] Test individual utility functions (ID generation, etc.). // Basic utils exist
  - [ ] Test React components in isolation.
  - [ ] Test Drizzle ORM query functions.
  - [ ] Mock external API clients (Stripe, Vision, LLM).
- [ ] **Integration Testing**
  - [x] Test API endpoints (Next.js API routes) with mock data and dependencies. // Tested manually
  - [x] Test frontend component interactions (e.g., form submissions). // Tested manually
  - [x] Test frontend-backend interaction points (fetching data, submitting forms). // Tested manually
- [x] **End-to-End Testing (Cypress/Playwright)**
  - [x] Simulate full user flows (Start -> Pay -> Upload -> Questionnaire -> Results). // Tested manually
  - [ ] Test QR code flow.
  - [ ] Test "Retrieve Previous Analysis" flow.
  - [x] Test error handling scenarios (payment failure, invalid image, analysis error). // Basic manual tests
- [ ] **Performance Testing**
  - [ ] Analyze frontend load times and bundle size (Next.js build analysis, Lighthouse).
  - [ ] Measure backend API response times, especially the analysis pipeline.
- [ ] **Security Testing**
  - [ ] Review secure handling of API keys.
  - [x] Verify secure webhook validation.
  - [ ] Check for common web vulnerabilities (XSS, CSRF - less relevant for account-less).
  - [ ] Run dependency vulnerability scans (e.g., `npm audit`).
  - [ ] Ensure temporary data is reliably deleted.

## 8. Documentation

- [x] **API Documentation**
  - [x] Document all backend API endpoints (routes, request/response formats, authentication). Consider OpenAPI/Swagger. // Documented in technical-flow.md
- [ ] **User Guide**
  - [ ] Create clear instructions within the app (selfie guide, process steps).
  - [ ] Develop a comprehensive Privacy Policy.
- [x] **Developer Documentation**
  - [x] Write/update `README.md` with setup instructions, architecture overview, and contribution guidelines. // README likely exists
  - [x] Document complex logic (analysis pipeline, state management decisions). // Done via technical-flow.md
  - [x] Document environment variable requirements.
- [x] **System Architecture Documentation**
  - [x] Create diagrams illustrating the overall system flow, component interactions, and external service integrations. // Done via technical-flow.md

## 9. Deployment

- [ ] **CI/CD Pipeline Setup (Vercel/GitHub Actions)**
  - [ ] Configure automated builds, tests, and deployments for main branch / PRs.
  - [ ] Setup environment variable handling for different stages (dev, staging, prod).
- [ ] **Environment Setup**
  - [ ] Configure Supabase for production (backups, access controls).
  - [ ] Configure Stripe for production mode (live keys, webhook endpoints).
  - [ ] Configure Google Cloud Vision API for production use.
  - [ ] Configure LLM provider (OpenAI/Anthropic) for production use.
- [ ] **Deployment to Vercel**
  - [ ] Deploy Next.js application.
  - [ ] Configure custom domain(s) if applicable.
- [ ] **Monitoring Setup**
  - [ ] Setup Vercel Analytics or similar for traffic monitoring.
  - [ ] Integrate error tracking service (e.g., Sentry).
  - [ ] Monitor Supabase database performance and usage.
  - [ ] Monitor external API usage and costs (Vision, LLM, Payment).

## 10. Maintenance

- [ ] **Bug Fixing Procedures**
  - [ ] Establish a process for reporting, tracking, and fixing bugs (e.g., GitHub Issues).
- [ ] **Update Processes**
  - [ ] Define strategy for applying dependency updates (Node.js, Next.js, libraries).
  - [ ] Plan for future feature enhancements or LLM prompt updates.
- [ ] **Backup Strategies**
  - [ ] Configure and verify Supabase automated backups.
- [ ] **Performance Monitoring**
  - [ ] Regularly review monitoring dashboards (Vercel, Sentry, Supabase).
  - [ ] Monitor API costs and optimize if necessary.

## 11. Feature: Optional Account Creation & Analysis Linking (NEW - Anonymous Plugin Approach)

- [ ] **Step 1: Setup Better Auth & Anonymous Plugin**
  - [ ] Install `@better-auth/next`, `@better-auth/plugin-anonymous`, and relevant client packages.
  - [ ] Configure Better Auth environment variables (`.env`).
  - [ ] Create Better Auth API route (`src/app/api/auth/[...betterauth]/route.ts`).
  - [ ] Create/Update Better Auth configuration file (`src/lib/auth.ts`):
    - [ ] Add `anonymous` plugin to `plugins` array.
    - [ ] Implement `onLinkAccount` hook logic (`UPDATE analyses SET userId...`).
    - [ ] Define standard providers (Email/Password min). Session strategy.
  - [ ] Wrap layout (`src/app/layout.tsx`) with Better Auth client provider if needed.
  - [ ] Configure Better Auth client instance (`src/lib/auth-client.ts`) with `anonymousClient`.
- [ ] **Step 2: Modify Database Schema & Migrate**
  - [ ] Ensure `userId` (nullable, foreign key type matching Better Auth ID) exists on `analyses` table in `src/db/schema.ts`.
  - [ ] **Remove** `claimToken` from `sessions` table in `src/db/schema.ts` if previously added.
  - [ ] Generate Drizzle migration (`pnpm drizzle-kit generate`).
  - [ ] Apply migration (`pnpm drizzle-kit migrate` or `push`).
- [ ] **Step 3: Initiate Anonymous Session & Store User ID**
  - [ ] Modify client-side payment success logic (e.g., `/payment-success`): Call `authClient.signIn.anonymous()` after verifying payment.
  - [ ] Modify `POST /api/v1/analysis/[sessionId]/start/route.ts`: Get current (anonymous) user ID via `auth()` helper and set it in the `analyses.userId` field when creating the record.
  - [ ] Modify `GET /api/v1/analysis/[sessionId]/status/route.ts`: Remove `claimToken` from the response.
  - [ ] Modify `AnalysisProcessor` component: Remove logic for storing/handling `claimToken`.
- [ ] **Step 4: Update Frontend Results Page (`/analysis/[analysisId]/page.tsx`)**
  - [ ] Fetch analysis data including `userId`.
  - [ ] Use Better Auth client hook (`useSession`?) to get auth state.
  - [ ] Implement conditional rendering logic for "Create Account" / "Log In" buttons based on `session.user.isAnonymous` and `analysis.userId`.
  - [ ] Implement button handlers to trigger standard Better Auth `signUp`/`signIn` flows.
- [ ] **Step 5: Create Profile Page**
  - [ ] Create route `src/app/profile/page.tsx`.
  - [ ] Protect route (check session server-side).
  - [ ] Fetch analyses for the logged-in user based on `userId`.
  - [ ] Display list of linked analyses.
- [ ] **Step 6: Testing (New Feature)**
  - [ ] Test anonymous session creation post-payment.
  - [ ] Test analysis creation includes anonymous `userId`.
  - [ ] Test signup flow triggers `onLinkAccount` and updates `analyses.userId`.
  - [ ] Test login flow (linking existing anonymous session) triggers `onLinkAccount`.
  - [ ] Test shared link scenario (User B signup doesn't affect User A's analysis).
  - [ ] Test profile page displays correct analyses.
  - [ ] Verify anonymous user record deletion (default behavior).
  - [ ] Consider testing anonymous user cleanup strategy.
