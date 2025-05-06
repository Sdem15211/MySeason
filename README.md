# MySeason - AI Personal Color Analysis App

MySeason is a web (& mobile) application that provides users with an accurate and personalized color and seasonal analysis. It uses a combination of a user-uploaded selfie, a short questionnaire, Computer Vision (Google Cloud Vision API), image processing (`sharp`), and a Large Language Model (Claude 3.5 Sonnet via Vercel AI SDK) to generate results.

Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI, Drizzle ORM, and Supabase. Users can get an analysis anonymously and optionally create an account using Better Auth to save their results.

## TODO

### Completed (MVP) ✅

- [x] Project Setup
- [x] Backend Foundation
- [x] Core Feature Backend (Payment, Selfie Upload & Validation, Questionnaire, Analysis Pipeline, Result Storage/Retrieval)
- [x] Frontend Foundation
- [x] Core Feature Frontend
- [x] Manual Testing

### Pending ⏳

- [x] **New UI designs implementation!!**

  - [x] Homepage
  - [x] QR code scan screen
  - [x] Mobile selfie capturing screen!!
  - [x] Questionnaire
  - [x] Processing page
  - [x] Analysis result page
    - [x] General tab
    - [x] Color tab
    - [x] Style tab
    - [x] Hair tab
    - [x] Makeup tab
  - [x] Signup/Login screen
  - [x] Profile page

- [x] **Optimize LLM prompt**
- [x] **Feature: "Color Passport" Generation & Download**
- [ ] **Backend improvements**
  - [ ] data cleanup
  - [ ] general backend improvements (error handling, clean up messy code)
- [ ] **Frontend improvements**
  - [ ] design & build homepage
- [ ] **Mobile app (React Native & Expo)**
