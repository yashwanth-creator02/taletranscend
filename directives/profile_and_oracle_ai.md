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

### 1. Chronicler Profile Architecture & Settings Integration

- **Profile Page View (`profile.html`)**:
  - **Standalone Full-Height Layout**: Does not inject the universal navigation header (`#app-nav`) or mobile dock (`#app-dock`). Global command palette is mounted on-demand via `initGlobalPaletteShortcut()`. The Identity Pillar opens with a single Back pill (`#profile-back-btn`, `.btn-back-pill`) and no Home/Library links; `handleProfileBack()` returns the visitor to the originating in-app page via `safeNavigateBack('/index.html')`, safely routing to Home when the URL was pasted or the prior page was login.
  - **Three-Column Desktop Grid**: Fluid 3-column workspace with defaults set to `430px` (left identity panel), `minmax(0, 1fr)` (central flow), and `340px` (right metrics panel), persistently adjustable via draggable resize handles.
  - **Resize Handle Hover Dividers**: Hovering, focusing, or dragging the resize handle renders a full-height luminous vertical dividing line (`.resize-handle::before`) using `var(--accent)`.
  - **Top-Right Edit Button**: Replaced the full-width button below the bio with a compact, accessible icon button (`#btn-edit-desktop` / `.identity-edit-btn-corner`) positioned at the top-right corner of the identity card.
  - **Continue Reading Card Consistency**: Every card in the horizontal scrolling row uses fixed card height (`295px`), fixed image height (`128px`), uniform title line height & truncation (`h-6 leading-6 truncate`), clamped description (`h-9 line-clamp-2`), and pinned bottom progress bar (`mt-auto`).
  - **Achievements Section (`#profile-achievements-section`)**: Located directly below The Archive in the central column. Displays an unlocked milestone counter badge and renders cards for all items in `ACHIEVEMENT_REGISTRY` (`bronze`, `silver`, `gold`, `platinum` tiers) with dynamic progress bars and status shields.
- **Settings Page Profile Editor (`settings.html#profile`)**:
  - Full-featured chronicler identity configuration embedded in the living archive settings suite.
  - Divided card rows: Avatar preview & URL, Display Name with Oracle AI name suggester (`#btn-suggest-name`), Reader Moniker / Signature (`#setting-reader-moniker`), Lore & Bio (stacked layout `.settings-row--stacked` positioned cleanly below the sideheading with live character counter `#bio-char-count`), Pronouns, Location / Realm, Favourite Genre chips (`#genre-selector`), Yearly Reading Milestone, Social URLs, and Oracle AI & Gemini Key configuration via popup modal dialog (`#modal-gemini-key`).
  - Form commits directly to Firestore `refs.user(uid)` validated against `UserProfileSchema` via `validateData`.

### 2. Gemini API Key Storage & Popup Modal Window

- **Security & Storage Principle**:
  - The Gemini API key belongs strictly to the user and is stored exclusively on the client in `localStorage` under `taletranscend_gemini_api_key`.
  - Never transmit, synchronize, or store the user's API key in Firestore user records or server logs.
- **Global Modal Window & Toast Action UX**:
  - A centralized, global popup modal (`src/ui/components/geminiModal.js`) is mounted dynamically on any page across the MPA when requested.
  - On the Settings page, the clean status badge (`#gemini-key-status`: "Key Configured" vs "Not Configured") and trigger button (`#btn-open-gemini-key-modal`: "Manage Key" vs "Configure Key") open the dialog.
  - When the Gemini API key is missing during an AI invocation anywhere across the application (e.g. Scribe's Atelier, Profile name conjuring), `showMissingGeminiKeyToast()` triggers a warning toast with an actionable `"Tap to add"` button that summons the global modal.
  - Explanatory security callout (`.gemini-info-box` / `.settings-info-box`) informs the user of private on-device archival storage and direct-to-Google communication.
  - Direct external link to Google AI Studio to easily retrieve or generate a free API key.
  - Interactive password visibility toggle button (`#btn-toggle-modal-key`: "Show" / "Hide").
  - Dedicated **Delete Key** button (`#btn-clear-modal-key` / `data-testid="btn-delete-modal-key"`) with `trash-2` icon and danger styling alongside Save Key (`#btn-save-modal-key`) and Cancel (`#btn-cancel-modal-key`).
  - Closes gracefully via backdrop click, Close icon (`#modal-gemini-close`), Cancel button, or the `Escape` key.
  - Broadcasts a `'gemini-key-changed'` event on `window` to keep all page controls, badges, and inputs in sync.
- **Backwards Compatibility**:
  - Hidden inputs (`#input-gemini-key`, `#btn-toggle-gemini-key`, `#btn-save-gemini-key`) and `#btn-clear-modal-key` are maintained to ensure legacy scripts and test suites remain 100% interoperable.

### 3. Oracle AI Integration (Names & Text Refinement)

- **Bio-Driven Name Suggestions**:
  - Header of the Display Name field provides `#btn-suggest-name`.
  - When clicked, inspects the current bio field (`#input-bio`).
  - Invokes `generateMythicNameSuggestions(bio, apiKey)` from `src/services/ai.service.js`.
  - If no custom API key is stored, gracefully falls back to system suggestions or informs the user to provide a key.
- **Contribution Atelier Oracle AI Suite**:
  - In `contribution.html`, authors can access the dedicated Oracle AI assistance panel (`#oracle-ai-panel`):
    - "Suggest Title" (`#btn-oracle-title`): Analyzes the current story synopsis/content and generates thematic titles using `generateMythicNameSuggestions` or AI completion.
    - "Elevate Passage" (`#btn-oracle-polish`): Refines selected or active draft prose with mythic diction and cadence using `refineProseWithOracle`.
    - "Continue Chronicle" (`#btn-oracle-continue`): Extends narrative arcs based on current lore using `generateTaleContinuation`.
  - **Scribe's Primer & Word Goal**:
    - Live word counter and target goal progress shield (`#stat-word-goal-status`) tracking progress against a target of 1,500 words per chapter.
    - Collapsible Scribe's Primer panel (`#scribes-primer-panel`) detailing narrative conventions, chapter formatting, and pacing.
- **Chronicler Moniker & Title Guards**:
  - Uninitialized or anonymous user profiles must gracefully default to the mythic moniker `Wandering Chronicler` rather than machine placeholders like `User_Name` or empty strings.
  - Profile and chronicle title renders must pass through sanitizing title guards (`_cleanDisplayTitle`) to ensure internal Firestore document IDs (e.g. `user_123abc` or arbitrary hash IDs) are never exposed directly to the reader as document titles.
- **Avatar Presets Palette**:
  - In `settings.html`, below `#input-avatar-url`, an avatar preset palette offers instant mythic avatars ("Scribe", "Oracle", "Archivist", "Wanderer") to quickly equip stylized avatars without requiring external image hosting.
- **Scribe Registry Guide & Application**:
  - Profile includes a collapsible "What is a Verified Scribe?" disclosure detailing the 4 concrete benefits (Archival Crest, Reader Missives, Oracle Atelier, Eternal Preservation).
  - The Scribe Registry application modal features a 3-step progress shield (Eligibility, Sample Chronicle, Oath) ensuring transparent requirements before submission.

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
