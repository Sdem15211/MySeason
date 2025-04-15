# Questionnaire Handling Implementation Plan (Revised)

## 1. Objective

To implement a multi-step questionnaire feature where users provide additional input after successful selfie validation. The collected answers will be stored temporarily in the `sessions` table, linked to the specific session ID, preparing for the final AI analysis step.

This plan assumes the overall technical flow documented in `docs/PRD.md` Section 11, where the `sessions` table tracks the in-progress state.

## 2. Database Schema Changes (`src/db/schema.ts`)

1.  **Modify `sessions` Table:**
    - **Status Enum:** Ensure `sessionStatusEnum` includes:
      - `'awaiting_questionnaire'` (set by the `/validate` endpoint upon success)
      - `'questionnaire_complete'` (add this; set by the `/questionnaire` endpoint upon success)
      - `'analysis_pending'` (can be set by `/questionnaire` or `/start` endpoint)
    - **Image URL:** Ensure a column exists to store the validated image blob URL (e.g., `uploaded_image_path` or rename/use `image_blob_url`). Make sure it's `text` and `nullable`.
    - **Questionnaire Data:** Ensure the `questionnaire_data` column (`jsonb`, `nullable`) exists.
2.  **Update Drizzle Schema:** Run `pnpm drizzle-kit generate:pg` to create migration files.
3.  **Apply Migrations:** Run `pnpm drizzle-kit push:pg` (or appropriate migration command) to apply changes to the database.

## 3. Modify Validation Endpoint (`src/app/api/v1/analysis/validate/route.ts`)

- **Requirement:** This endpoint must be updated _first_ as per Step 5 in the PRD flow.
- **Logic:** Upon successful image validation (after Google Vision checks):
  - Find the session record in `sessions` table using `sessionId`.
  - If found and status is appropriate (e.g., `'payment_complete'` or `'awaiting_selfie'`), update the record:
    - Set the `uploaded_image_path` (or `image_blob_url`) column to the validated `blobUrl`.
    - Set the `status` column to `'awaiting_questionnaire'`.
    - Update `updatedAt`.
  - Return the success response to the client.

## 4. Frontend Implementation

1.  **Routing:** The frontend needs to handle navigation to `/analysis/[sessionId]/questionnaire` after receiving a successful response from the (updated) `/validate` endpoint. The `sessionId` must be passed in the URL.
2.  **Questionnaire Page Component (`app/analysis/[sessionId]/questionnaire/page.tsx`):**
    - Likely a Server Component initially.
    - Fetch the session data using the `sessionId` from URL params.
    - Verify the session `status` is `'awaiting_questionnaire'`. If not (e.g., wrong status, session expired, not found), redirect or show an error.
    - Render the client component (`QuestionnaireForm`) responsible for the multi-step logic, passing the `sessionId`.
3.  **Multi-Step Form Component (`QuestionnaireForm` - client component):**
    - Props: Receives `sessionId`.
    - Use Shadcn UI components (`Card`, `Progress`, `RadioGroup`, `Select`, `Input`, `Textarea`, `Button`, `Form` - potentially using `react-hook-form`).
    - Manage internal state for steps and form data (`currentStep`, `formData`).
    - Define questions and structure into steps.
    - Implement step navigation (`handleNext`, `handlePrevious`).
    - Display progress indicator.
    - On final step, provide a "Submit" button.
4.  **Submission Logic:**
    - On submit, disable button, show loading state.
    - Make a `POST` request to `/api/v1/analysis/[sessionId]/questionnaire` (using the `sessionId` prop) with the collected `formData`.
    - Handle API response:
      - **On Success (200 OK):** Redirect the user to the analysis processing page: `/analysis/[sessionId]/processing`.
      - **On Failure:** Show an error message, re-enable submit button.

## 5. Backend API Endpoint (`src/app/api/v1/analysis/[sessionId]/questionnaire/route.ts`)

1.  **Create Route Handler:** Implement the `POST` handler.
2.  **Input:**
    - Extract `sessionId` from URL parameters.
    - Parse questionnaire answers JSON from the request body.
3.  **Validation:**
    - Validate the structure/types of incoming answers (e.g., using Zod).
    - Validate `sessionId` format.
4.  **Database Interaction (using Drizzle):**
    - Query the `sessions` table for the record matching `sessionId`.
    - Verify the record exists and its current `status` is `'awaiting_questionnaire'`. Return error if not (e.g., 404 Not Found, 409 Conflict).
    - Update the session record:
      - Set the `questionnaire_data` column to the validated JSON data.
      - Update the `status` column to `'questionnaire_complete'` (or `'analysis_pending'`).
      - Update `updatedAt`.
5.  **Response:**
    - Return success (e.g., `200 OK` with `{ success: true }`).
    - Return appropriate errors (400, 500).

## 6. Triggering the Analysis Pipeline (Next Steps - Ref PRD Flow Steps 8-12)

- The questionnaire submission success redirects the user to the `/analysis/[sessionId]/processing` page.
- This page initiates the final analysis by calling `POST /api/v1/analysis/[sessionId]/start`.
- The `/start` endpoint retrieves data from the `sessions` table (`uploaded_image_path`, `questionnaire_data`), runs `sharp`/LLM, creates the final record in the `analyses` table, and updates the `sessions` status to `'analysis_complete'` and links the `analysisId`.
- Polling via `GET /api/v1/analysis/[sessionId]/status` checks the session status until completion or failure.
- Successful completion redirects to the final results page `/analysis/[analysisId]` (note the ID change).

## 7. Error Handling

- Client-side form validation.
- Server-side input validation (Zod) in the `/questionnaire` endpoint.
- Database error handling during session updates.
- Status checks in API endpoints to prevent unexpected state transitions.
- Clear user feedback on errors.

## 8. Open Questions/Refinements

- Decide status transition from `/questionnaire`: `'questionnaire_complete'` or directly to `'analysis_pending'`?
- Finalize UI/UX for multi-step form and processing page.
- Confirm column name: `uploaded_image_path` vs `image_blob_url`.
