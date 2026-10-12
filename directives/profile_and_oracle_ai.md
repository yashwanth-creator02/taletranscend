# Directive: Chronicler Profile, Oracle AI, and Interactive Tooltips

## Goal

Define the standard operating procedures, data contracts, and UI patterns for managing user chronicler identity, client-side Gemini API key persistence, Oracle AI generation and refinement features, and accessible, token-compliant interactive info tooltips.

## When this fires

- Updating chronicler profile views, edit modals, or tabs (`src/pages/profile/`, `src/views/profile.html`).
- Managing Gemini API key inputs, visibility toggles, or save actions (`src/services/ai/apiKey.storage.js`).
- Implementing or adjusting Oracle AI features (display name suggestions, lore refinement).
- Adding or positioning section-level or field-level interactive info tooltips (`.info-tooltip-wrap`, `.info-tooltip-box`).

## Inputs

- Profile attributes in Firestore (`v1/taletranscend/projects/v1/users/${uid}`): `displayName`, `bio`, `pronouns`, `location`, `favoriteGenres`, `socials` (`website`, `twitter`, `instagram`), `readingGoal`.
- Local browser storage: `taletranscend_gemini_api_key` in localStorage.
- Design tokens defined in `src/assets/css/tokens.css`.

## Git Safety (If Modifying Code)

- Branch creation requirement: Always work on a dedicated branch off `main` or `master`.
- Never commit directly to `main` or `master`.
- Merges to `main` require explicit user consent in conversation.

## Standard Operating Procedures

### 1. Chronicler Profile Architecture & Modal Form

- **Profile Layout Structure**:
  - Three-column desktop layout: Identity Pillar (left), Living Archive & Contributions (center), Legacy Metrics & Chronicle Goal (right).
  - Responsive drawer for mobile and tablet views.
- **Edit Profile Modal Tabs**:
  - Divided into 4 focused tabs: `Basic`, `Identity`, `Social`, and `Goals`.
  - Tab navigation sits in a fixed modal header above `#profile-form`.
  - `#profile-form` is an `overflow-y-auto` scrollable container allowing mobile access without viewport clipping.

### 2. Gemini API Key Storage & User Controls

- **Security & Storage Principle**:
  - The Gemini API key belongs strictly to the user and is stored exclusively on the client in `localStorage` under `taletranscend_gemini_api_key`.
  - Never transmit, synchronize, or store the user's API key in Firestore user records or server logs.
- **Dedicated Save Action**:
  - Provide a distinct Save button (`#btn-save-gemini-key`) alongside the Show/Hide visibility toggle (`#btn-toggle-gemini-key`).
  - Clicking Save immediately commits the trimmed key via `setStoredApiKey(val)` from `src/services/ai/apiKey.storage.js`.
  - Provide immediate user feedback via success toast (`"Gemini API key saved."`).
  - Emptying the input and clicking Save deletes the stored key and confirms removal.
- **Key Visibility Toggle**:
  - Default input state: `type="password"`.
  - Clicking `#btn-toggle-gemini-key` toggles between `password` and `text`, updating button label between `"Show"` and `"Hide"`.

### 3. Oracle AI Integration (Names & Text Refinement)

- **Bio-Driven Name Suggestions**:
  - Header of the Display Name field provides `#btn-suggest-name`.
  - When clicked, inspects the current bio field (`#input-bio`).
  - Invokes `generateMythicNameSuggestions(bio, apiKey)` from `src/services/ai.service.js`.
  - If no custom API key is stored, gracefully falls back to system suggestions or informs the user to provide a key.
- **Contribution Atelier Prose Refinement**:
  - In `contribution.html`, authors can invoke Oracle refinement to enhance prose with mythic diction and tone adjustments.

### 4. Interactive Info Tooltip Standard

- **HTML Blueprint**:
  Every section header or input label requiring functional explanation must use the standard tooltip component:
  ```html
  <div class="info-tooltip-wrap">
    <button
      type="button"
      class="p-0.5 text-slate-500 hover:text-indigo-400 transition-colors cursor-help"
      aria-label="Section info"
    >
      <i data-lucide="info" class="w-3.5 h-3.5"></i>
    </button>
    <div class="info-tooltip-box">Explanatory text describing functionality.</div>
  </div>
  ```
- **Modal & Scrollable Container Placement Rule**:
  - In root layouts, tooltips position upward (`bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%)`).
  - Inside scrollable containers or modals (`#edit-modal .info-tooltip-box` or `.info-tooltip-box--bottom`), tooltips must position downward:
    ```css
    .info-tooltip-wrap .info-tooltip-box--bottom,
    #edit-modal .info-tooltip-box {
      bottom: auto;
      top: calc(100% + 6px);
      left: 0;
      transform: none;
      text-align: left;
    }
    ```
  - **Clipping Prevention**: Downward placement prevents top fields (`Location`, `Website`, etc.) from extending upward into container boundaries or rendering beneath the modal's `Basic | Identity | Social | Goals` tab bar.
- **Stacking Context Elevation**:
  - `.info-tooltip-wrap:hover, .info-tooltip-wrap:focus-within { z-index: 50; }` guarantees hovered tooltips render cleanly on top of subsequent sibling inputs and form fields.
- **Design Token Discipline**:
  - Tooltip styling must strictly reference design tokens: background `rgb(var(--dark-rgb) / 0.95)`, border `rgb(var(--light-rgb) / var(--a-10))`, text `rgb(var(--light-rgb) / var(--a-80))`. Zero raw color literals.

## Tools / Scripts to Use

- Run interactions and profile verification:
  ```powershell
  python execution/verify_interactions_and_profile.py
  ```
- Run targeted profile UI unit tests:
  ```powershell
  npx vitest run src/pages/profile/__tests__/ui.test.js
  ```
- Run AI service integration tests:
  ```powershell
  npx vitest run src/services/__tests__/ai.service.test.js
  ```

## Outputs

- Responsive chronicler profile with persisted identity fields across all 4 modal tabs.
- Local Gemini API key management with explicit save and toggle controls.
- Consistent, non-clipping hover tooltips across all sections and form fields.

## Edge Cases & Error Handling

- **Invalid or Missing Gemini API Key**: If the API key is missing or rejected by the Gemini API, catch errors, display an informative toast, and do not block manual input.
- **Empty Bio Name Suggestion**: If the user clicks "Suggest Name" with an empty bio, prompt them to write a brief sentence in their bio to give the Oracle context.
- **Edge Overflow**: Use `.info-tooltip-box--left` or `.info-tooltip-box--right` when tooltips are positioned near screen borders to prevent horizontal page scrolling.
