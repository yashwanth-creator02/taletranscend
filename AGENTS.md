# TaleTranscend Agent Guidance

This document provides high-signal instructions for agent sessions to quickly understand and work within the TaleTranscend repository.

## Project Overview

- **Architecture**: Multi-Page Application (MPA) using Vanilla JavaScript (ES2022 modules), Tailwind CSS, and Vite. No client-side SPA router.
- **Backend**: Firebase (Firestore, Anonymous Auth).
- **State Management**: Uses a global mutable singleton (`appState`) and page-local state objects with direct DOM manipulation.
- **Image Storage**: Cover images currently use external URLs.
- **Authentication**: Firebase Anonymous Auth is used, providing a persistent anonymous UID to every visitor.

## Developer Commands

- **Install Dependencies**: `npm install`
- **Start Dev Server**: `npm run dev`
- **Build for Production**: `npm run build`
- **Run Unit/Integration Tests**: `npm test`
- **Run E2E Tests (Playwright)**: `npm run e2e`
- **Lint**: `npm run lint`
- **Lint Design Tokens**: `npm run lint:tokens` (fails on any raw colour literal outside `tokens.css`)
- **Format**: `npm run format`
- **Run All Checks (Format, Lint, Tokens, Types, Tests)**: `npm run verify`
- **Type Check**: `npm run type-check`

## Environment Setup

1. **Configuration**: Copy `.env.example` to `.env` and fill in Firebase project credentials.
2. **Firestore Index**: Deploy the required composite index using `firebase deploy --only firestore:indexes`. The index definition is in `firestore.indexes.json`.
3. **Firestore Rules**: Production-grade security rules are defined in `firestore.rules`. Enforces strict schema validations, author ownership, and admin-only chronicle dissolution under the Chronicle Preservation Policy.
4. **Firestore Database Path**: All application data resides under `v1/taletranscend/projects/v1/`.

## Code Structure & Conventions

- **TypeScript Aliases**:
  - `@fb/*`: `src/firebase/*`
  - `@services/*`: `src/services/*`
  - `@state/*`: `src/state/*`
  - `@ui/*`: `src/ui/*`
  - `@pages/*`: `src/pages/*`
  - `@config/*`: `src/config/*`
  - `@css/*`: `src/assets/css/*`
  - `@/*`: `src/*`
- **Directory Ownership**:
  - `src/pages/`: Contains separate directories for each HTML page, reflecting the MPA architecture.
  - `src/firebase/`: Firebase SDK wrappers.
  - `src/services/`: Business logic and data access.
  - `src/utils/`: TypeScript utility modules.
- **Pre-commit Hooks**: Husky is configured (`package.json`, `prepare` script) to run linting and formatting on staged files using `lint-staged`.

---

# Agent Instructions & 3-Layer Architecture

You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This system fixes that mismatch.

## The 3-Layer Architecture

**Layer 1: Directive (What to do)**

- Basically just SOPs written in Markdown, live in `directives/`
- Define the goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions, like you'd give a mid-level employee

**Layer 2: Orchestration (Decision making)**

- This is you. Your job: intelligent routing.
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- You're the glue between intent and execution.

**Layer 3: Execution (Doing the work)**

- Deterministic scripts in `execution/`
- Environment variables, API keys, etc. are stored in `.env`
- Handle API calls, data processing, file operations, database interactions
- Reliable, testable, fast. Use scripts instead of manual work. Commented well.

## Operating Principles

**1. Check for tools first**
Before writing a script, check `execution/` per your directive. Only create new scripts if none exist.

**2. Self-anneal when things break**

- Read error message and stack trace
- Fix the script and test it again
- Update the directive with what you learned (API limits, timing, edge cases)

**3. Update directives as you learn**
Directives are living documents. When you discover API constraints, better approaches, common errors, or timing expectations—update the directive. Directives are your instruction set and must be preserved.

**4. Anti-Vibecoding & Aesthetics Standards**

- **Zero emojis**: Never use emojis anywhere in UI, code, logs, comments, commit messages, terminal outputs, or documentation. Zero exceptions.
- **Zero glowing or pulsing dots**: Never use neon green dots, pulsing indicator pips, or AI "agent active" dots.
- **Zero pill-type labels or badges**: Never use pill-shaped labels (`border-radius: 9999px`) or floating pill badges unless explicitly requested by the user. Use clean structural typography, technical rectangular shields, or subtle metadata text.
- **Eliminate AI "vibecoded" cliches**: Avoid generic SaaS tropes (gratuitous floating tags, decorative blur rings, cookie-cutter purple/neon gradients, generic marketing fluff badges). Focus on authentic, intentional craft.
- **Single-source colors**: All colors must derive from design tokens in `src/assets/css/tokens.css`. Never write raw hex or rgb literals in CSS or components.

**5. Git Safety & Branch Isolation**

- Create a dedicated branch for every new feature, bug fix, or major refactor. Never commit directly to `main` or `master`.
- Never merge any branch into `main` or `master` without explicit permission from the user in the conversation. The branch is the safety net; merges require explicit user confirmation.

**6. Use Skills Wherever Possible**

- Proactively inspect `.agents/skills/` (and all available environment skills) before writing custom code, scripts, or reinventing patterns. Note the leading dot: the directory is `.agents/skills/`, not `agents/skills/`.
- Leverage matching skills whenever applicable rather than writing ad-hoc implementations.

**7. Maintain Documentation & Proactive Inception**

- Always maintain and update project documentation (`README.md`, `docs/`) with every code change, feature, or refactor.
- If no documentation is present in the project, proactively ask the user to initiate the creation of documentation.

**8. Destination Setup & 3-Layer Infrastructure Population**

- Maintain the project's 3-layer architecture directories (`directives/`, `execution/`, `.tmp/`) and `.agents/skills/`.
- Directly consult Layer 1 directives in `directives/` for repeatable procedures.
- Strictly adhere to the 3-layer infrastructure (Layer 1: Directives, Layer 2: Orchestration, Layer 3: Execution).

**9. Continuous Knowledge & Directive Population (/populate)**

- Systematically invoke the populate skill (`.agents/skills/populate/SKILL.md`) after completing major features, refactors, UI redesigns, or architectural decisions to update corresponding Layer 1 directives in `directives/` and keep project documentation synchronized.
- Ensure directives remain living documents, preserving discovered patterns, edge cases, and design constraints permanently for future sessions.
- Always keep directives and documentation relevant, accurate, and up-to-date with current code implementations.

**10. Value Reporting — "What I Gained"**

- End every response with a closing section titled `What I Gained` (exact heading text), written from the user's perspective.
- State what this turn concretely delivered: working features, fixed bugs, removed risks, time saved, future problems avoided, or knowledge gained. Ground every bullet in the turn's actual output (files, commands, verification results).
- Keep it to 2-5 tight bullets. No generic filler, no marketing fluff, zero emojis.
- If a turn produced no user-visible gain (pure research, an answered question), state the knowledge or decision gained instead of inventing value.

**11. Discernment Nudges & Clarifying Questions — Unlimited Frequency**

- The `discernment-nudge` skill is not limited to once per conversation: invoke the nudge whenever it genuinely applies, as many times as you want.
- Clarifying questions — inline or via the question tool — may likewise be asked however many times they are needed. Never withhold a genuine question to honor an "ask only once" convention.

**12. Worktree Bootstrap Mandate (Mandatory)**

A git worktree checks out tracked files only. Everything gitignored is absent, which silently breaks agent tooling rather than erroring loudly. Immediately after creating any new worktree, run:

```powershell
python execution/setup_worktree.py
```

This is mandatory before running tests, the dev server, or any MCP tool in the new worktree. Never skip it because "the files look fine" — the failures it prevents are silent and misleading.

What the runner restores, and why each is required:

| Artifact               | Gitignored | Consequence if missing                                                                            |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `node_modules/`        | yes        | `npx` re-resolves remotely on every MCP start                                                     |
| `.agents/skills/`      | yes        | Brand skills vanish; agents lose `populate`, `discernment-nudge`, `frontend-design`, and the rest |
| `.vercel/project.json` | yes        | Vercel project link lost; `vercel` MCP drops to team scope                                        |
| `.env`, `.env.local`   | yes        | Firebase credentials absent; app boots broken                                                     |
| `.dev-port`            | yes        | Dev server and E2E fall back to 5173 and collide with other worktrees                             |

Use `--check` to report state without changing anything, and `--source <path>` when the primary checkout is not the git main worktree.

Never hand-author `.vercel/project.json` or commit any env file. The runner refuses to copy a destination git would track, so a secret cannot reach a commit even by mistake; it reports byte counts and key names only, never values.

The `chrome-devtools` MCP server needs nothing copied: it auto-provisions Chrome for Testing and caches the binary and profile outside the repository.

**Per-worktree dev ports.** Each worktree is assigned its own dev server port so several can run simultaneously. The registry lives at `.git/worktree-ports.json`, shared by every worktree of this repository, and `.dev-port` holds the current worktree's value. Both `vite.config.js` and `playwright.config.js` read `.dev-port`, falling back to 5173 when absent, so `npm run dev` and `npm run e2e` need no manual port flags.

```powershell
python execution/setup_worktree.py --list-ports        # show every allocation
python execution/setup_worktree.py --release-port     # free this worktree's port
python execution/setup_worktree.py --release-port <path>   # free another worktree's port
```

**Release the port once the branch is merged.** A merged worktree has served its purpose and its port must be freed:

```powershell
git worktree remove <path>
python execution/setup_worktree.py --release-port <path>
```

Allocation also prunes entries whose worktree directory no longer exists, so a forgotten release self-heals on the next setup run. Never hardcode a port in a committed config file.

## Self-annealing loop

Errors are learning opportunities. When something breaks:

1. Fix it
2. Update the tool
3. Test tool, make sure it works
4. Update directive to include new flow
5. System is now stronger

## File Organization

**Deliverables vs Intermediates:**

- **Deliverables**: Committed source code, deployed builds, persistent repository documentation.
- **Intermediates**: Temporary files needed during processing.

**Directory structure:**

- `.tmp/` - All intermediate files (scraped data, temp exports). Never commit, always regenerated.
- `execution/` - Deterministic runner scripts.
- `directives/` - SOPs in Markdown (the instruction set).
- `.env` - Environment variables and API keys (in `.gitignore`).

<!-- brand-leo-utils:skill-sync:start -->

## Skills (brand-leo-utils)

This project's skills live in `.agents/skills/` — gitignored here. The
brand-leo-utils repo is the source of truth; this folder is a disposable
local copy, and it belongs to whichever agent is handling the session,
not one specific tool.

- To load or refresh skills from brand-leo-utils, follow its
  `directives/instantiate_project_skills.md`.
- To update or migrate this project to the latest brand guidelines, skills, and infrastructure,
  follow its `directives/update_project_from_brand.md`.
- If you create or edit a skill under `agents/skills/`, it isn't done
until it's synced back: follow brand-leo-utils's
`directives/sync_skill_to_brand.md`. All directives branch first,
never commit to main/master directly, and only reach main via a
pull request or an explicit, separate go-ahead from the user.
<!-- brand-leo-utils:skill-sync:end -->
