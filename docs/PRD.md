# PRD: AI Personal Color Analysis App

## 1. Product overview

### 1.1 Document title and version

- PRD: AI Personal Color Analysis App
- Version: 1.1 (Comprehensive)

### 1.2 Product summary

This document outlines the requirements for the "AI Personal Color Analysis App" (Working Title: MySeason). The application provides users with an accurate and personalized color and seasonal analysis derived from a user-uploaded selfie and answers to a brief questionnaire. It leverages Computer Vision (CV) via Google Cloud Vision API to extract facial landmarks and image quality indicators, uses a backend image processing library (`sharp`) to analyze specific color regions (skin, eyes, hair), and employs a Large Language Model (LLM) via Vercel AI SDK to generate the final, detailed analysis and advice.

The initial product will be a Minimum Viable Product (MVP) web application built with Next.js. A key strategic goal is the subsequent development of a mobile application using React Native/Expo. Therefore, the web application's architecture, especially the backend API layer, must be designed for maximum reusability to ensure efficient development of the mobile app. The application will feature an account-less, pay-per-analysis model, focusing on user-friendliness, privacy, and generating a shareable "Personal Card" output to encourage organic growth.

## 2. Goals

### 2.1 Business goals

- Validate the market demand and technical feasibility of AI-driven personal color analysis.
- Generate revenue through a one-time fee per analysis model.
- Achieve organic growth through the shareable "Personal Card" feature.
- Establish a foundation (reusable API) for efficient future expansion into a mobile application.

### 2.2 User goals

- Receive an accurate, personalized, and actionable color/seasonal analysis quickly and conveniently.
- Understand which colors complement their natural features (skin, eyes, hair).
- Get practical advice on clothing, makeup (if applicable), hair color, and accessories based on their analysis.
- Have a simple, private, and intuitive user experience without needing to create an account.
- Obtain a visually appealing summary ("Personal Card") of their results that they can save and share.

### 2.3 Non-goals

- Creating user accounts or storing user profiles in the MVP.
- Storing user input data (selfies, questionnaire answers) permanently.
- Providing complex styling advice beyond color coordination (e.g., body shape analysis, specific garment recommendations).
- Building a social network or community features within the MVP.
- Developing the mobile application during the initial MVP phase (focus on web first).
- Implementing features requiring recurring subscriptions in the MVP.

## 3. User personas

### 3.1 Key user types

- **Style Curious Individuals:** Users interested in improving their personal style, fashion choices, or makeup application but unsure about their best colors.
- **DIY Enthusiasts:** Users who prefer self-service tools over potentially expensive in-person consultations.
- **Social Sharers:** Users who enjoy sharing personalized results and insights online.

### 3.2 Basic persona details

- **Alex (Style Curious):** Mid-20s, wants to update their wardrobe for a new job but feels overwhelmed by color choices. Wants quick, reliable advice. Values convenience and privacy.
- **Jamie (DIY Enthusiast):** 30s-40s, enjoys experimenting with makeup and style, reads blogs/watches tutorials, seeks affordable tools to refine their look based on color theory.
- **Casey (Social Sharer):** Early 20s, active on social media, enjoys personality quizzes and sharing fun, personalized content like aesthetic summaries or results. Values shareability and visual appeal.

### 3.3 Role-based access

- **Anonymous User:** This is the only role. All users interact with the application without logging in. They can initiate an analysis, pay, provide input, and view/download their results using a unique ID.

## 4. Functional requirements

- **Payment Integration** (Priority: High)
  - [x] Redirect user to a payment provider (Stripe) upon starting a new analysis.
  - [x] Securely process one-time payments.
  - [x] Receive and validate payment confirmation via webhooks.
  - [x] Handle payment failures gracefully, providing user feedback.
- **Selfie Upload & Capture** (Priority: High)
  - [ ] Provide clear instructions for taking a good quality selfie (lighting, pose).
  - [ ] Offer QR code flow for desktop users to use their mobile camera.
  - [ ] Implement direct browser camera access (`getUserMedia`) for mobile/QR flow.
  - [ ] Display a camera overlay guide (face outline, eye line) to aid positioning.
  - [ ] Allow photo preview before uploading.
  - [x] Temporarily store uploaded photo linked to the paid session.
- **Image Quality Validation** (Priority: High)
  - [x] Utilize Google Cloud Vision API (`FACE_DETECTION`) results.
  - [x] Check for exactly one face detected.
  - [x] Validate `detectionConfidence` and `landmarkingConfidence` against thresholds.
  - [x] Validate `underExposedLikelihood` and `blurredLikelihood` against thresholds.
  - [x] Provide specific user feedback on failure and allow re-upload.
- **Questionnaire** (Priority: High)
  - [x] Present a short (<10 questions) form after successful image validation.
  - [x] Gather data like gender preference (for makeup), age range, personality keywords, context for advice.
  - [x] Temporarily store answers linked to the session.
- **Backend Analysis Pipeline** (Priority: High)
  - [ ] Retrieve landmarks from validated Vision API response.
  - [ ] Use `sharp` library to extract small image regions around key landmarks (eyes, cheeks, forehead/eyebrows).
  - [ ] Calculate average color (HEX/RGB) for skin, eyes, and hair regions.
  - [ ] Combine extracted colors and questionnaire answers into a structured input.
  - [x] Invoke LLM (via Vercel AI SDK) with a detailed prompt requesting structured JSON output (season, palettes, advice).
  - [x] **Crucially, this entire pipeline must be exposed via a well-defined API endpoint suitable for consumption by both web and future mobile clients.**
- **Result Generation and Storage** (Priority: High)
  - [x] Generate a unique analysis ID (UUID v4) upon successful LLM response.
  - [x] Store the complete LLM analysis result (`JSONB` format) in the database (Supabase/PostgreSQL) linked to the unique ID.
  - [ ] Delete temporary input data (photo, answers).
- **Result Display** (Priority: High)
  - [x] Redirect user to a unique results page (`/analysis/[id]`).
  - [ ] Render the full analysis content from the database based on the ID.
  - [ ] Display the unique analysis ID clearly.
  - [ ] Provide a "Copy ID" button.
  - [ ] Instruct user to save the ID/URL for future access.
- **Personal Card Generation & Download** (Priority: High)
  - [ ] Generate a visually appealing summary image (PNG/JPG) based on analysis results.
  - [ ] Implement generation (client-side `html2canvas` or server-side `sharp`/headless browser).
  - [ ] Provide a button to download the generated card.
- **Retrieve Previous Analysis** (Priority: Medium)
  - [ ] Provide an input field on the homepage to enter a previously saved analysis ID.
  - [ ] Query the backend API to find the analysis by ID.
  - [ ] Redirect to the results page if found, show error if not found.

## 5. User experience

### 5.1. Entry points & first-time user flow

- User lands on the homepage.
- Clear Call-to-Action (CTA) "Start New Analysis". Option to "View Previous Analysis".
- Clicking "Start" immediately initiates the payment flow.
- Post-payment: Seamless transition to selfie instructions/upload.
- Guided process through selfie quality check, questionnaire, and analysis generation (with loading indicators).
- Clear presentation of results with emphasis on saving the unique ID/URL and downloading the card.

### 5.2. Core experience

- **Payment**: Quick redirection to a trusted payment provider. Clear confirmation or failure message upon return.
  - Ensure the process feels secure and standard.
- **Selfie Upload**: Simple instructions, helpful overlay, intuitive camera controls. Feedback on quality issues is immediate and actionable.
  - Make the QR code flow easy to understand for desktop users.
- **Questionnaire**: Short, clear questions. Minimal typing required (e.g., use selections).
- **Analysis Wait**: Provide visual feedback (e.g., progress steps, animation) that the analysis is in progress. Avoid a static "loading" state for too long.
- **Results**: Information is well-structured and easy to read. Colors are clearly displayed. Advice is concise and actionable. The unique ID and download card options are prominent.
  - Ensure the results page is visually appealing and reinforces the value provided.

### 5.3. Advanced features & edge cases

- **QR Code Flow**: Handle cases where the user navigates away or the phone connection is lost during the QR process. Provide clear instructions.
- **Multiple Faces/Poor Quality**: Provide specific, helpful error messages rather than generic failures. Allow easy re-attempts.
- **Analysis Errors**: Handle API timeouts or errors gracefully, inform the user, and suggest retrying. Log errors for debugging.
- **ID Retrieval**: Handle typos or invalid ID formats entered by the user.

### 5.4. UI/UX highlights

- Clean, modern, and visually appealing interface. Aesthetics should align with fashion/style themes.
- Mobile-first responsive design.
- Smooth transitions and micro-interactions.
- Excellent readability of text content (advice).
- Clear visualization of color palettes.
- The "Personal Card" should be beautifully designed and instantly shareable.

## 6. Narrative

Alex, keen to refine their professional look, feels lost in the world of color theory. They stumble upon MySeason. Intrigued by the promise of quick, AI-powered personal analysis without creating an account, Alex initiates the process. After a simple payment, they follow the clear instructions to take a well-lit selfie using their phone (prompted by a QR code on their desktop) and answer a few quick questions about their style goals. Within moments, the app presents a detailed analysis revealing Alex is a "Soft Autumn". They receive a custom color palette, specific clothing and accessory advice, and a downloadable "Personal Card" summarizing the key info. Alex feels empowered with clear, actionable guidance and confidently shares their stylish summary card online, excited to apply their newfound color knowledge.

## 7. Success metrics

### 7.1. User-centric metrics

- Analysis Completion Rate (Successful Payment to Result Display).
- "Personal Card" Download Rate.
- Rate of successful image quality validation (vs. re-uploads needed).
- User feedback/ratings (if a feedback mechanism is implemented later).

### 7.2. Business metrics

- Number of Analyses Purchased.
- Conversion Rate (Homepage visitors to Paid Analyses).
- Revenue Generated.
- Organic traffic/mentions potentially driven by shared "Personal Cards".

### 7.3. Technical metrics

- API Response Times (Vision API, LLM, Database).
- Image Processing Time (sharp).
- API Error Rates (Vision, LLM, Payment, Database).
- Server Uptime / Application Availability.

## 8. Technical considerations

### 8.1. Integration points

- Payment Provider API (e.g., Stripe) - Requires handling webhooks securely.
- Google Cloud Vision API - Requires API key management and error handling.
- LLM Provider API (e.g., OpenAI, Anthropic via Vercel AI SDK) - Requires API key management, prompt engineering, and response parsing/validation.
- Image Processing Library (`sharp`) - Runs server-side.
- Database (Supabase/PostgreSQL).

### 8.2. Data storage & privacy

- **Analyses Table:** Stores only the final analysis results (JSONB) linked to a non-identifiable UUID.
- **Temporary Storage:** User-uploaded photos and questionnaire answers must be stored securely only for the duration of the analysis process and reliably deleted afterwards. Document this process.
- **No User Accounts:** Reinforces privacy; no personal data stored long-term besides the anonymous analysis result.
- **Compliance:** Ensure compliance with relevant data privacy regulations (e.g., GDPR if applicable). Clear privacy policy required.

### 8.3. Scalability & performance

- Utilize serverless functions (Vercel) for backend API endpoints to handle scaling.
- Optimize database queries (indexing the `id` column).
- Monitor performance of external API calls (Vision, LLM) and image processing.
- Consider response streaming for LLM results to improve perceived performance.
- Ensure efficient image handling (resizing if needed before processing).

### 8.4. Potential challenges

- **Color Accuracy:** Consistency of color extraction from selfies under varying, uncontrolled lighting conditions remains the biggest technical risk. Requires robust quality checks and potentially sophisticated LLM prompting to interpret results.
- **LLM Reliability & Cost:** Ensuring consistent quality and structure from LLM output. Managing API costs per analysis.
- **Prompt Engineering:** Developing effective prompts for the LLM to generate accurate and well-formatted analyses based on extracted colors and user answers.
- **Payment Flow Complexity:** Securely handling payment redirects and webhook confirmations in an account-less system.
- **User Adherence to Instructions:** Users providing poor-quality selfies despite instructions.

## 9. Milestones & sequencing

### 9.1. Project estimate

- **Medium:** 4-6 weeks (for MVP web application).

### 9.2. Team size & composition

- Small Team: 1-2 total people
  - 1 Full-stack Developer (experienced with Next.js, knowledgeable about API integrations). Optionally split into Frontend/Backend roles if 2 people.

### 9.3. Suggested phases

- **Phase 1: Backend Core & API Setup (1-2 weeks)**
  - Key deliverables: [x] Setup Next.js project, [x] Supabase DB schema, [x] basic API routes structure, [x] integrate payment provider (initiation & basic webhook), [x] setup Google Cloud Vision API auth, [x] setup Vercel AI SDK auth. [x] Define API contracts.
- **Phase 2: Core Analysis Pipeline (2-3 weeks)**
  - Key deliverables: [x] Implement secure temporary storage, [x] integrate Vision API for landmark detection, [ ] integrate `sharp` for color extraction from landmarks, [x] implement detailed LLM prompting and response handling (basic placeholder), [x] implement result saving to DB with unique ID. [x] **Focus on API reusability.** (Endpoints created)
- **Phase 3: Frontend UI & User Flow (2-3 weeks)**
  - Key deliverables: [x] Build homepage, [x] payment initiation UI, [x] selfie upload page (basic implementation), [x] quality check feedback loop, [x] questionnaire form, [ ] results display page, [ ] implement "View Previous" flow, [ ] integrate "Copy ID" and [ ] basic "Download Card" (placeholder if needed). [x] Implement responsive design (basic).
- **Phase 4: Polishing & Testing (1 week)**
  - Key deliverables: [ ] Refine UI/UX, [ ] implement detailed "Personal Card" generation, [x] thorough end-to-end testing (initial flow), [x] implement error handling (basic), [ ] write privacy policy, [ ] prepare for deployment.

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
- **Description**: As an anonymous user, after the analysis is complete, I want to view my detailed results on a dedicated page so that I can understand my color season and recommendations.
- **Acceptance Criteria**:
  - User is directed to a unique URL (`/analysis/[id]`).
  - The page displays all sections generated by the LLM (Season, Palette, Avoid, Metals, Clothing, Makeup, Hair, Description).
  - The content is well-formatted and easy to read.
  - Color palettes are visually displayed (e.g., swatches).

### 10.8. Receive and save unique analysis ID

- **ID**: US-008
- **Description**: As an anonymous user, I want to receive a unique ID for my analysis results so that I can potentially view them again later.
- **Acceptance Criteria**:
  - The unique analysis ID (UUID) is clearly displayed on the results page.
  - A "Copy ID" button allows easy copying to the clipboard.
  - A message advises the user to save the ID or the page URL.

### 10.9. Download personal card

- **ID**: US-009
- **Description**: As an anonymous user, I want to download a visually appealing summary card ("Personal Card") of my analysis so that I can easily save, reference, and share my results.
- **Acceptance Criteria**:
  - A "Download Card" button is present on the results page.
  - Clicking the button initiates the download of a summary image (PNG/JPG).
  - The card contains key information (e.g., season name, top colors, metal tones) in an attractive layout.

### 10.10. Retrieve previous analysis using ID

- **ID**: US-010
- **Description**: As an anonymous user who saved my analysis ID, I want to enter this ID on the homepage to retrieve and view my previous results.
- **Acceptance Criteria**:
  - Homepage has an option "View Previous Analysis" leading to an input field.
  - User can enter a UUID.
  - Submitting the ID queries the backend.
  - If the ID exists, the user is redirected to the corresponding results page (`/analysis/[id]`).
  - If the ID does not exist, an appropriate error message is shown.

## 11. Detailed Technical Flow (Current Implementation)

This section documents the technical flow as implemented and planned, clarifying the roles of different components and data persistence, particularly the use of the `sessions` table for in-progress state and the `analyses` table for final results.

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

3.  **Selfie Upload Trigger (Frontend):**

    - User is redirected back to the app after payment (e.g., to `/analysis/[sessionId]/upload`).
    - The `SelfieAnalyzer` component (or similar) handles the upload process.

4.  **Blob Upload & Authorization (`POST /api/v1/blob/upload`):**

    - The frontend uses `@vercel/blob/client`'s `upload` function, passing the `sessionId` in the `handleUploadUrl`.
    - This triggers a call to this backend route for authorization _before_ generating the upload token.
    - The route handler verifies:
      - `sessionId` is provided in the query params.
      - The corresponding `sessions` record exists.
      - The session `status` is `'payment_complete'`.
      - The session has not expired.
    - If valid, it returns the necessary information for the client library to proceed with the direct upload to Vercel Blob.

5.  **Image Validation (`POST /api/v1/analysis/validate`):**

    - After the client successfully uploads the image to Vercel Blob, it calls this endpoint with the `blobUrl` and `sessionId`.
    - The route handler calls the `validateSelfieImage` utility (using Google Cloud Vision API) with the `blobUrl`.
    - **If validation fails:** The blob is deleted, and an error response is returned.
    - **If validation succeeds:**
      - The route handler finds the `sessions` record by `sessionId`.
      - It updates the `sessions` record:
        - Stores the `blobUrl` in the `uploaded_image_path` (or `image_blob_url`) column.
        - Sets the `status` to `'awaiting_questionnaire'`.
      - It returns a success response to the client.

6.  **Questionnaire Flow (Frontend):**

    - Upon receiving success from `/validate`, the frontend redirects the user to the questionnaire page (e.g., `/analysis/[sessionId]/questionnaire`).
    - A multi-step form gathers user answers.

7.  **Questionnaire Submission (`POST /api/v1/analysis/[sessionId]/questionnaire`):**

    - The frontend submits the collected answers along with the `sessionId`.
    - The route handler finds the `sessions` record, verifies status is `'awaiting_questionnaire'`.
    - It updates the `sessions` record:
      - Stores the answers in the `questionnaire_data` column.
      - Sets the `status` to `'questionnaire_complete'`.
    - Returns a success response.

8.  **Analysis Trigger Flow (Frontend -> Backend):**

    - Upon successful questionnaire submission, the frontend redirects to a processing page (e.g., `/analysis/[sessionId]/processing`).
    - This page triggers `POST /api/v1/analysis/[sessionId]/start`.

9.  **Analysis Pipeline Execution (`POST /api/v1/analysis/[sessionId]/start`):**

    - Finds the `sessions` record, verifies status is `'questionnaire_complete'`.
    - Updates session status to `'analysis_pending'`.
    - Retrieves `uploaded_image_path` (or `image_blob_url`) and `questionnaire_data` from the session.
    - **(Pipeline Steps):**
      - Downloads the image from the blob URL.
      - Performs image analysis using `sharp` (color extraction, etc.).
      - Constructs the prompt for the LLM using `sharp` results and questionnaire data.
      - Calls the LLM API (via Vercel AI SDK).
      - Parses and validates the LLM response.
    - **(On Pipeline Success):**
      - **Creates a new record** in the `analyses` table, storing the final `result` JSON.
      - Updates the `sessions` record:
        - Sets `status` to `'analysis_complete'`.
        - Links `analysisId` to the ID of the new record in the `analyses` table.
    - **(On Pipeline Failure):**
      - Updates the `sessions` record status to `'analysis_failed'`.

10. **Status Check (`GET /api/v1/analysis/[sessionId]/status`):**

    - The processing page polls this endpoint.
    - The route handler finds the `sessions` record and returns its current `status`.
    - If `'analysis_complete'`, it also returns the linked `analysisId` (the ID of the record in the `analyses` table).

11. **Result Display (Frontend):**

    - When the status check returns `'analysis_complete'` and the final `analysisId`, the frontend redirects to the results page (e.g., `/analysis/[analysisId]`).
    - This page fetches the analysis data directly from the `analyses` table using the final `analysisId`.

12. **Data Cleanup:**
    - Temporary data (image blob, `uploaded_image_path`/`image_blob_url`, `questionnaire_data` in `sessions` table) should be cleared/deleted after analysis completion or session expiry to maintain privacy and storage efficiency. This could be done at the end of the `/start` endpoint or via a separate process.
