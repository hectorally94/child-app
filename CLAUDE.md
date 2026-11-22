# CLAUDE.md — project memory

Read this first when starting a new session on this repository.

## What this is
Home Learning Companion: an offline-first learning app (web app first, Android later) for children aged 3–6
(initially one 4-year-old in Burundi). Child Mode (primary) + protected Parent Mode.
Full spec: `docs/PRD.md` (source of truth for requirements).

## Key product rules (from the PRD)
- Demonstrate before asking; one small task at a time; encourage, never punish.
- Lessons are **data-driven** (JSON + assets), not hard-coded screens. Adding "Write 1" must not need new app code.
- **Offline-first**: downloaded lessons work with no network; progress survives restarts; sync is idempotent.
- **i18n from day one**: Kirundi (`rn`), French (`fr`), English (`en`); no strings inside components. Child and parent languages can differ.
- AI is optional; core features never depend on it.
- Privacy: minimal child data, no ads, no social features, no external links in Child Mode, parental gate for Parent Mode.
- Never present a single "ability" score; don't claim confident judgments when detection is uncertain.

## Stack
- Now: React 18 + TypeScript + Vite + **Tailwind CSS v4** (`@tailwindcss/vite`) + **Framer Motion** for animation.
  No backend. Data in `localStorage` (device only).
  Service worker (`public/sw.js`) caches the app for offline use in production builds.
- Later (PRD §18): REST API, PostgreSQL, object storage, sync of progress; Android packaging.

## Commands
- `npm install` then `npm run dev` (local dev server)
- `npm test` (Vitest), `npm run typecheck`, `npm run build` (outputs `dist/`)
- Deploy for testing: Vercel (Vite preset, output `dist`).

## Code map
- `src/content/lessons/*.json` — lessons (data). New lesson = new JSON file, no code.
- `src/engine/` — lesson types, stroke geometry, attempt evaluation (`evaluate.ts`), parent summary, speech (device TTS).
- `src/modes/` — `ChildMode` (lesson player), `ParentGate` (multiplication gate), `ParentMode` (dashboard, lessons, settings).
- `src/components/Slate.tsx` — canvas slate: guide, demo animation, captures strokes.
- `src/i18n/` — UI strings + fallback (`rn` → `fr` → `en`).
- `src/storage/` — versioned local store (children, sessions with attempts).

## Design (v2, 2026-11-22)
- Style chosen with the **UI/UX Pro Max** skill (github.com/nextlevelbuilder/ui-ux-pro-max-skill) "Kids Learning" guidance
  + the frontend-design skill: **claymorphism**, vibrant colors, spring bounce, soft press, rounded fonts.
- Tokens live in `src/index.css` (`@theme`): canvas `#F4F1FA`, ink `#2B2740`, blue `#2563EB`, sun `#FBBF24`,
  pink `#EC4899`, mint `#10B981`, violet `#7C3AED`. Components: `.clay`, `.clay-btn` (+ `is-sun|is-mint|is-pink|is-white|is-ghost`), `.clay-input`.
- Fonts (bundled, offline): Nunito 700–900 (display), DM Sans (body). Both draw a plain 0.
- Mascot **Pipo** (`src/components/Mascot.tsx`, original SVG bird) guides the child; moods: idle, talk, happy, encourage.
- Writing board: light clay card, school writing lines, violet dotted guide, blue demo crayon, pulsing green start dot,
  orange direction arrow, child draws in pink.
- Motion: `MotionConfig reducedMotion="user"`; one confetti burst on completion; icons from one set (`src/components/Icon.tsx`).
- Parent mode: same clay system, calmer; bottom navigation (Tableau de bord / Leçons / Paramètres); preview plays the real demo.

## Current status
- [x] Phase 0: PRD added to repo
- [x] Phase 1 prototype: child mode, parent gate + mode, "Write 0" and "Write 1" lessons, tracing with
      demonstration, independent writing, cautious feedback, local progress, device TTS audio, EN/FR
- [ ] Test with the real child; adjust stroke data to match the teacher's method
- [x] UI v2: Tailwind + claymorphism + mascot + animations; adaptive demo replay after 2 missed traces; "Write 2" lesson
- [ ] Prerecorded audio (device TTS for now)
- [ ] Phase 2: lesson packages/download, backend + sync, more writing lessons

## Decisions log
- 2026-11-22: Start as a **web app** (not mobile). Android packaging later.
- 2026-11-22: UI follows the frontend-design skill; slate/chalk concept for child mode, notebook for parent mode.
- 2026-11-22: Default stroke for 0: start at top, counter-clockwise (common school convention). Change in the lesson JSON if the teacher differs.
- 2026-11-22: Evaluation is cautious: success / retry / uncertain; uncertain is shown as encouragement, never failure. After max attempts the lesson moves on kindly.
- 2026-11-22: No backend yet; all data stays on the device.
- 2026-11-22: Test deployments go to Vercel (via the Vercel MCP), connected to the GitHub repo.
- 2026-11-22: GitHub repo name: **child-app** (public).
- 2026-11-22: Languages: **French (default) and English** are the standard. Kirundi postponed.
- 2026-11-22: Stack confirmed by user: React + Tailwind CSS, with animations.
- 2026-11-22: Teacher method improvised: 0 = start top, counter-clockwise; 1 = small stroke up then straight down;
  2 = start left, round back over the top, slide down-left, straight base line.

## Open questions
- Packaging approach for Android later (PWA, Capacitor, or other).
- Graphify (context tool) requested: confirm which tool; add once there is more code.
- UI/UX Pro Max skill is not vendored into `.claude/skills/` (needs the user's permission to install a downloaded skill).
