# Color Passport Feature Implementation Plan

This document outlines the steps required to implement the shareable/downloadable Color Passport feature in the MySeason application using client-side rendering with `html2canvas`.

**Goal:** Allow users to view and download a personalized image summarizing their color analysis results directly from the analysis results page.

**Core Technology:** Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn UI, `html2canvas`.

## 1. Setup & Dependencies

- **Install `html2canvas`:**
  ```bash
  npm install html2canvas
  # or
  yarn add html2canvas
  # or
  pnpm add html2canvas
  ```
- **Verify Dependencies:** Ensure `react`, `react-dom`, `next`, `tailwindcss`, and Shadcn UI components (`Dialog`, `Button`) are correctly installed and configured.

## 2. Image Generation Strategy: Client-Side with `html2canvas`

- **Approach:** The `ColorPassport` component will be rendered within the `AnalysisResultsClient` component (potentially hidden initially). When the user clicks the "Download" button, `html2canvas` will capture the rendered DOM node of the `ColorPassport` component.
- **Output:** `html2canvas` generates a Canvas element, which can then be converted to a PNG data URL (`canvas.toDataURL('image/png')`). This data URL will be used for both displaying a preview in a modal and triggering the download.
- **No API Route Needed:** This approach avoids the need for a dedicated server-side API route for image generation.

## 3. Color Passport Image Component

- **File:** `src/components/color-passport/color-passport.tsx` (Existing)
- **Structure & Styling:**
  - The existing `ColorPassport` component structure and props definition remain valid.
  - Continue using **Tailwind CSS classes** for styling. `html2canvas` attempts to replicate the browser's rendering of these styles.
  - The component should accept the necessary analysis data (season, colors, etc.) as props.
  - Ensure the root element has defined dimensions (e.g., `w-[600px] h-[1200px]`) as this helps `html2canvas` determine the capture area.
  - **Images (Logo/QR Code):** Use standard `<img>` tags. Ensure the `src` attributes are accessible URLs or embedded data URLs. Consider potential CORS issues if images are hosted externally; embedding might be more reliable for `html2canvas`.
  - **Fonts:** Use standard web fonts. Custom or complex fonts might require testing for correct rendering by `html2canvas`.

## 4. Frontend Integration on Results Page (`AnalysisResultsClient`)

- **File:** `src/components/features/analysis/analysis-results-client.tsx`
- **Refactoring:** The existing refactor to make this a Client Component is correct.
- **Implement Generation Logic:**
  - Import `html2canvas` from 'html2canvas'.
  - Import `useRef`, `useState`, `useCallback` from 'react'.
  - **Add State:** Keep state for modal visibility (`isModalOpen`). Add state to hold the generated image data URL (`const [passportImageDataUrl, setPassportImageDataUrl] = useState<string | null>(null);`) and potentially loading/error states for the generation process.
  - **Add Ref:** Create a `useRef` to attach to the DOM node containing the `ColorPassport` component that needs to be captured (`const passportRef = useRef<HTMLDivElement>(null);`).
  - **Render Hidden Component:** Render the `<ColorPassport {...props} />` component within the `AnalysisResultsClient` return JSX. It can be positioned absolutely off-screen or hidden using CSS (`opacity-0`, `pointer-events-none`, `position: absolute`, `left: -9999px`) to avoid affecting layout but still be available in the DOM for capture. Pass the necessary `result` data as props.
  - **Generate Function:** Create an `async` function (`generatePassportImage`) triggered by the "Download Color Passport" button click.
    - Inside the function:
      - Set loading state to true.
      - Check if `passportRef.current` exists.
      - Call `html2canvas(passportRef.current, { /* options */ })`. Useful options might include `scale` (for higher resolution) or `useCORS: true` (if using external images).
      - `await` the result.
      - Convert the resulting canvas to a PNG data URL: `const dataUrl = canvas.toDataURL('image/png');`
      - Set `passportImageDataUrl` state with the `dataUrl`.
      - Open the modal (`setIsModalOpen(true)`).
      - Handle potential errors using `try...catch`.
      - Set loading state to false.
  - **Update Button:** Modify the existing "Download Color Passport" button's `onClick` handler to call `generatePassportImage`. Remove the `<DialogTrigger>` wrapping if generation happens _before_ opening the modal.
  - **Implement Dialog:**
    - Use the `<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>` component.
    - Inside `<DialogContent>`:
      - Display the generated image using the `passportImageDataUrl` state: `<img src={passportImageDataUrl} alt="Your Color Passport Preview" />`. Show a loading indicator while `passportImageDataUrl` is null (and the generation is in progress).
      - Add a download button/link that uses the same `passportImageDataUrl`:
        ```jsx
        <a href={passportImageDataUrl} download="myseason-color-passport.png">
          <Button variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Download Image
          </Button>
        </a>
        ```
- **Data Preparation:** Ensure all necessary data points (season, undertone, contrast, colors (hex), metal, makeup colors (hex), logo URL, QR code URL) are correctly extracted from the `result` prop and passed to the hidden `ColorPassport` component.

## 5. Styling & Refinements

- **Style Passport Component:** Ensure styles in `color-passport.tsx` render accurately when captured by `html2canvas`. Test complex styles like gradients or shadows.
- **Style Modal:** Adjust `DialogContent` sizing as needed.
- **Loading/Error States:** Implement visual feedback for the image generation process (e.g., disabling the button, showing a spinner) and display errors if `html2canvas` fails.
- **Quality:** Experiment with the `scale` option in `html2canvas` (e.g., `scale: 2` for double resolution) if the default output quality is insufficient, but be mindful of performance impact.
- **Accessibility:** Maintain accessible labels and attributes for buttons and interactive elements.

## 6. Testing

- **Rendering Accuracy:** Thoroughly test the generated image output across different browsers. Check if Tailwind styles, fonts, images (logos, QR codes), and colors render correctly compared to the live component. Pay attention to gradients or complex layouts.
- **Functionality:** Test the button click, loading state, modal display, image preview, and download action.
- **Data Variations:** Test with different analysis results to ensure all data variations are handled correctly in the generated image.

## 7. Future Mobile Considerations

- **Web Approach:** This `html2canvas` method is browser-specific and **not directly reusable** in React Native.
- **React Native:** For the mobile app, a different approach will be needed. Options include:
  - **`react-native-view-shot`:** Capture a `<View>` containing similarly styled components directly within the native app. This requires rebuilding the passport layout with React Native components.
  - **API Endpoint (Alternative):** If high fidelity is critical on mobile and `react-native-view-shot` is insufficient, you might reconsider a server-side rendering solution (like Puppeteer or a third-party service - Options 2 & 3 from the previous discussion) accessible via an API endpoint that both web and mobile could call. This centralizes logic but reintroduces server-side complexity.
