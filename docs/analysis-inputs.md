# Color Analysis Inputs

This document outlines the necessary data points to be collected for a comprehensive and personalized color analysis. Inputs are gathered through both automatic image processing and a user questionnaire.

## Automatic Extraction / Calculation (from User Image)

These features are intended to be extracted or calculated programmatically from the user's uploaded photo.

- [x] **Eye Color:**
  - [x] Dominant eye color(s) hex value.
- [x] **Skin Color & Undertone:**
  - [x] Average skin color hex value (from cheeks & forehead).
  - [x] Calculated Undertone: Estimated undertone (Warm, Cool, Neutral, Olive, Undetermined) derived from converting the average skin color to Lab color space. This serves as a supplementary data point; user questionnaire answers about undertone are prioritized.
- [x] **Eyebrow Color:**
  - [x] Average eyebrow color hex value (calculated from central eyebrow regions).
- [x] **Contrast Levels (Calculated):**
  - [x] Skin-to-Eye Contrast: Value difference between dominant skin tone and eye color.
  - [x] Skin-to-Hair Contrast: Value difference between dominant skin tone and _natural_ hair color (requires hair input from questionnaire).
  - [x] Eye-to-Hair Contrast: Value difference between eye color and _natural_ hair color (requires hair input from questionnaire).
  - [x] Overall Contrast: Synthesized contrast level categorized as High, Medium, or Low based on the above factors.

## User Questionnaire

These inputs are collected directly from the user to provide context that cannot be reliably determined automatically or requires self-assessment.

- [x] **Makeup Usage:**
  - Options: Yes, No, Prefer not to say.
  - _Purpose:_ Determines whether to include makeup recommendations in the analysis.
- [x] **Age:**
  - User provides their age (numeric input or range).
  - _Purpose:_ May subtly influence recommendations (e.g., style advice maturity, makeup finishes), but the core season analysis is less dependent on it. Evaluate its impact during LLM prompt engineering.
- [ ] **Natural Hair Color (Mandatory):**
  - User selects their _natural_ hair color from a well-designed visual swatch palette.
  - _Purpose:_ Essential for contrast calculations and determining overall color harmony.
- [x] **Skin's Reaction to Sun:**
  - Multiple choice question based on typical reactions.
  - Options:
    - "I burn easily and rarely tan." (Suggests Cool)
    - "I usually burn first, then tan lightly." (Suggests Cool/Neutral)
    - "I tan easily and rarely burn." (Suggests Warm)
    - "My skin tans deeply and I almost never burn." (Suggests Warm/Deep/Olive)
  - _Purpose:_ Classic indicator for determining skin undertone.
- [x] **Vein Color:**
  - User observes veins on their wrist in natural light.
  - Multiple choice question.
  - Options:
    - "My veins appear mostly Blue or Purple." (Suggests Cool)
    - "My veins appear mostly Green." (Suggests Warm)
    - "My veins appear to be a mix of Blue and Green." (Suggests Neutral)
  - _Purpose:_ Another classic indicator for determining skin undertone.
- [x] **Jewelry Preference/Look:**
  - User reflects on which metal tones they feel look best on them.
  - Multiple choice question.
  - Options:
    - "Silver, Platinum, or White Gold looks best on me." (Suggests Cool)
    - "Gold or Yellow Gold looks best on me." (Suggests Warm)
    - "Both look good, or I prefer Rose Gold." (Suggests Neutral)
    - "I don't know / I don't usually wear jewelry."
  - _Purpose:_ Correlates strongly with skin undertone.
- [x] **Flattering Colors (Self-Reported):**
  - Question: "Think about the clothes you own. Which colors tend to get you the most compliments or make you feel the most confident?"
  - Input method: Multi-select from basic color families OR free text (consider complexity).
  - _Purpose:_ Provides subjective validation and personal preference data for the LLM.
- [x] **Unflattering Colors (Self-Reported):**
  - Question: "Are there any colors you tend to avoid because you feel they make you look tired, washed out, or 'off'?"
  - Input method: Multi-select from basic color families OR free text.
  - _Purpose:_ Provides subjective negative constraints and further insight into color sensitivity.

## TODO

- [ ] refine skinUndertone thresholding
- [ ] Add color swatch palette for hair color in questionnaire
- [ ] Use more skin regions for skin color extraction
