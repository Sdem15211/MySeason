# AI Personal Color Analysis App (MySeason) Development Plan

## Overview

The AI Personal Color Analysis App (MySeason) provides users with an accurate and personalized color and seasonal analysis derived from a user-uploaded selfie and a brief questionnaire. It leverages Google Cloud Vision API for facial landmarks, `sharp` for image analysis, and an LLM (OpenAI/Anthropic via Vercel AI SDK) for generating the analysis. The MVP is a Next.js web application designed with a reusable backend API for a future React Native/Expo mobile app, featuring an account-less, pay-per-analysis model.

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
  - [x] Generate initial Drizzle migration files.
  - [x] Setup Drizzle Kit for managing migrations.
- [x] **Session Management (Account-less)**
  - [x] Design strategy for tracking user sessions across payment and analysis steps (e.g., temporary session ID, linking payment ID to analysis process).
  - [x] Implement secure temporary storage mechanism for session data (e.g., Redis, or temporary DB table - decide).
- [ ] **Core Services & Utilities**
  - [x] Implement utility for generating unique IDs (UUID v4).
  - [x] Setup client for Google Cloud Vision API.
  - [x] Setup client for Vercel AI SDK (configured for Google Gemini).
  - [x] Setup client for Supabase database interactions using Drizzle.
  - [ ] Implement secure API key management (environment variables, secrets manager). (Deferred)
  - [x] Implement robust error handling and logging framework. (Basic try/catch + console logging implemented in utils; Robust framework deferred)
- [x] **Base API Structure (Next.js API Routes/Route Handlers)**
  - [x] Define base API route structure (e.g., `/api/v1/...`).
  - [x] Implement base request/response handling and validation middleware. (Basic error handling wrapper implemented; validation deferred)
  - [x] **Design API contracts with future mobile app reusability in mind.**

## 3. Feature-specific Backend

- [x] **Payment Integration (Polar)**
  - [x] API endpoint to initiate payment checkout session.
    - [x] Generate payment intent/session with the provider.
    - [x] Return checkout URL/ID to the frontend.
    - [x] Store temporary payment session details.
  - [x] API endpoint (webhook) to handle payment confirmation.
    - [x] Securely validate webhook signature.
    - [x] Update internal session state upon successful payment.
    - [x] Handle payment failures/cancellations.
- [ ] **Selfie Upload & Validation**
  - [ ] API endpoint to receive uploaded selfie image.
    - [ ] Implement secure temporary storage for the uploaded image linked to the session ID/payment ID.
    - [ ] Validate image file type and size.
  - [ ] Integrate Google Cloud Vision API (`FACE_DETECTION`).
    - [ ] Call Vision API with the uploaded image.
    - [ ] Process response to check face count (exactly 1).
    - [ ] Validate `detectionConfidence`, `landmarkingConfidence`, `underExposedLikelihood`, `blurredLikelihood` against defined thresholds.
    - [ ] Return structured validation result (success/failure with specific reasons) and landmarks if successful.
    - [ ] Implement logic to delete temporary image if validation fails.
- [ ] **Questionnaire Handling**
  - [ ] API endpoint to receive questionnaire answers.
  - [ ] Implement secure temporary storage for answers linked to the session ID.
  - [ ] Validate submitted answers.
- [ ] **Backend Analysis Pipeline (Core Logic)**
  - [ ] API endpoint to trigger the main analysis process (post-questionnaire submission).
  - [ ] Retrieve validated image landmarks and questionnaire answers from temporary storage.
  - [ ] Load temporary image file.
  - [ ] Integrate `sharp` library for image processing.
    - [ ] Extract image regions around key landmarks (eyes, cheeks, forehead/eyebrows).
    - [ ] Calculate average color (HEX/RGB) for each region.
  - [ ] Integrate Vercel AI SDK (OpenAI/Anthropic).
    - [ ] Construct detailed prompt including extracted colors, questionnaire answers, and desired JSON output structure (season, palettes, advice sections).
    - [ ] Handle LLM API call, including potential streaming and error handling.
    - [ ] Parse and validate the structured JSON response from the LLM.
  - [ ] Generate unique analysis UUID.
- [ ] **Result Storage & Cleanup**
  - [ ] Store the validated LLM analysis result (JSONB) in the Supabase `analyses` table using Drizzle, linked to the unique UUID.
  - [ ] Implement robust deletion of all temporary data (image file, questionnaire answers, session data) after successful storage.
  - [ ] Return the unique analysis UUID to the frontend.
- [ ] **Result Retrieval**
  - [ ] API endpoint `GET /api/v1/analysis/{id}` to retrieve analysis results.
  - [ ] Query Supabase/Drizzle using the provided UUID.
  - [ ] Return the stored analysis JSON or a 404 error if not found.

## 4. Frontend Foundation

- [ ] **UI Framework Setup (Next.js 15 / React 19)**
  - [ ] Establish core layout components (`app/layout.tsx`).
  - [ ] Implement basic styling with Tailwind CSS.
  - [ ] Setup TypeScript interfaces/types for shared data structures.
- [ ] **Component Library**
  - [ ] Design and implement base UI components (Buttons, Inputs, Modals, Loading Spinners, etc.) using Tailwind CSS.
  - [ ] Ensure components are reusable and adhere to a consistent style guide.
- [ ] **Routing System (Next.js App Router)**
  - [ ] Define application routes (Homepage `/`, Analysis Results `/analysis/[id]`, intermediate flow pages).
  - [ ] Implement navigation between pages.
- [ ] **State Management**
  - [ ] Choose and implement a state management solution (e.g., React Context API, Zustand, Jotai) for managing global UI state and potentially fetched data.
- [ ] **Base UI Elements**
  - [ ] Implement Header/Footer components.
  - [ ] Implement basic error display components.

## 5. Feature-specific Frontend

- [ ] **Homepage (`/`)**
  - [ ] Implement "Start New Analysis" button triggering payment initiation API call.
  - [ ] Implement "View Previous Analysis" section with input field and button.
    - [ ] Add logic to call retrieval API and navigate on success, show error on failure.
- [ ] **Payment Flow UI**
  - [ ] Handle redirection to Stripe checkout page.
  - [ ] Implement UI for handling return URLs (success, failure/cancel).
- [ ] **Selfie Upload UI**
  - [ ] Create dedicated page/component for selfie upload instructions.
  - [ ] **Desktop Flow:**
    - [ ] Implement QR code generation (e.g., `react-qr-code`) linked to a unique session identifier.
    - [ ] Implement mechanism to check for completion from the mobile flow (e.g., WebSocket, polling).
  - [ ] **Mobile/QR Flow:**
    - [ ] Implement camera access using `getUserMedia`.
    - [ ] Implement camera overlay guide (HTML/CSS/SVG).
    - [ ] Implement capture, preview, and upload logic.
    - [ ] Send image file to the backend upload endpoint.
- [ ] **Image Quality Feedback UI**
  - [ ] Display specific error messages based on backend validation response.
  - [ ] Provide a clear "Try Again" button to re-initiate the upload flow.
- [ ] **Questionnaire Form UI**
  - [ ] Implement form using React Hook Form or similar library.
  - [ ] Render questions based on defined structure.
  - [ ] Handle form submission to the backend questionnaire endpoint.
- [ ] **Analysis Loading UI**
  - [ ] Display visual feedback (progress steps, animation) while the backend analysis pipeline runs.
  - [ ] Handle potential timeouts or errors from the analysis endpoint.
- [ ] **Results Page (`/analysis/[id]`)**
  - [ ] Implement dynamic route to fetch analysis data based on URL ID.
  - [ ] Render all sections of the analysis result (Season, Palettes, Advice) in a readable format.
  - [ ] Implement visual display for color palettes (swatches).
  - [ ] Display the unique analysis ID prominently.
  - [ ] Implement "Copy ID" button functionality.
- [ ] **Personal Card Generation & Download UI**
  - [ ] Design the "Personal Card" layout (HTML/CSS).
  - [ ] Implement generation logic:
    - [ ] **Option A (Client-side):** Use `html2canvas` to capture the card component as an image.
    - [ ] **Option B (Server-side):** Create an API endpoint that uses `sharp` or a headless browser (e.g., Puppeteer/Playwright on a serverless function) to generate the image (more complex setup). Decide approach.
  - [ ] Implement "Download Card" button to trigger image generation and download.

## 6. Integration

- [ ] Connect "Start New Analysis" button to backend payment initiation endpoint.
- [ ] Integrate payment provider success/failure callbacks to navigate the user flow.
- [ ] Connect selfie upload component to backend upload endpoint.
- [ ] Integrate backend image validation response into the frontend feedback loop.
- [ ] Connect questionnaire form submission to the backend endpoint.
- [ ] Trigger backend analysis pipeline endpoint after questionnaire submission.
- [ ] Poll or await backend analysis completion and retrieve the unique analysis ID.
- [ ] Navigate user to the results page (`/analysis/[id]`) upon completion.
- [ ] Connect results page data fetching to the backend retrieval endpoint.
- [ ] Connect "View Previous Analysis" input to the backend retrieval endpoint.
- [ ] Test the end-to-end QR code flow synchronization between desktop and mobile contexts.

## 7. Testing

- [ ] **Unit Testing (Jest/Vitest)**
  - [ ] Test individual utility functions (ID generation, etc.).
  - [ ] Test React components in isolation.
  - [ ] Test Drizzle ORM query functions.
  - [ ] Mock external API clients (Stripe, Vision, LLM).
- [ ] **Integration Testing**
  - [ ] Test API endpoints (Next.js API routes) with mock data and dependencies.
  - [ ] Test frontend component interactions (e.g., form submissions).
  - [ ] Test frontend-backend interaction points (fetching data, submitting forms).
- [ ] **End-to-End Testing (Cypress/Playwright)**
  - [ ] Simulate full user flows (Start -> Pay -> Upload -> Questionnaire -> Results).
  - [ ] Test QR code flow.
  - [ ] Test "Retrieve Previous Analysis" flow.
  - [ ] Test error handling scenarios (payment failure, invalid image, analysis error).
- [ ] **Performance Testing**
  - [ ] Analyze frontend load times and bundle size (Next.js build analysis, Lighthouse).
  - [ ] Measure backend API response times, especially the analysis pipeline.
- [ ] **Security Testing**
  - [ ] Review secure handling of API keys.
  - [ ] Verify secure webhook validation.
  - [ ] Check for common web vulnerabilities (XSS, CSRF - less relevant for account-less).
  - [ ] Run dependency vulnerability scans (e.g., `npm audit`).
  - [ ] Ensure temporary data is reliably deleted.

## 8. Documentation

- [ ] **API Documentation**
  - [ ] Document all backend API endpoints (routes, request/response formats, authentication). Consider OpenAPI/Swagger.
- [ ] **User Guide**
  - [ ] Create clear instructions within the app (selfie guide, process steps).
  - [ ] Develop a comprehensive Privacy Policy.
- [ ] **Developer Documentation**
  - [ ] Write/update `README.md` with setup instructions, architecture overview, and contribution guidelines.
  - [ ] Document complex logic (analysis pipeline, state management decisions).
  - [ ] Document environment variable requirements.
- [ ] **System Architecture Documentation**
  - [ ] Create diagrams illustrating the overall system flow, component interactions, and external service integrations.

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
