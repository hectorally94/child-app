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
- Now: React 18 + TypeScript + Vite web app, no backend. Data in `localStorage` (device only).
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

## Design
- Child mode = school slate (ardoise) + chalk: slate `#23443A`, chalk `#F7F3E3`, sun `#FFC93C` (start dot / main action only),
  hibiscus `#E84A5F` (celebration), sky `#BFE6F5`, wood `#8A5A33`. Font: Baloo 2. Icons, almost no text.
- Parent mode = notebook (cahier): paper, blue ink `#1F3A93`, ruled lines. Font: Atkinson Hyperlegible,
  with a plain-zero override (its 0 is slashed, wrong for a lesson about writing 0).
- Fonts are bundled (offline). Respect reduced motion.

## Current status
- [x] Phase 0: PRD added to repo
- [x] Phase 1 prototype: child mode, parent gate + mode, "Write 0" and "Write 1" lessons, tracing with
      demonstration, independent writing, cautious feedback, local progress, device TTS audio, EN/FR
- [ ] Test with the real child; adjust stroke data to match the teacher's method
- [ ] Kirundi texts and prerecorded audio (needs a native speaker)
- [ ] Phase 2: lesson packages/download, backend + sync, more writing lessons

## Decisions log
- 2026-11-22: Start as a **web app** (not mobile). Android packaging later.
- 2026-11-22: UI follows the frontend-design skill; slate/chalk concept for child mode, notebook for parent mode.
- 2026-11-22: Default stroke for 0: start at top, counter-clockwise (common school convention). Change in the lesson JSON if the teacher differs.
- 2026-11-22: Evaluation is cautious: success / retry / uncertain; uncertain is shown as encouragement, never failure. After max attempts the lesson moves on kindly.
- 2026-11-22: No backend yet; all data stays on the device.
- 2026-11-22: Test deployments go to Vercel (via the Vercel MCP).

## Open questions
- Primary language for the first prototype (Kirundi / French / English)?
- How the child's teacher demonstrates writing 0 (start point, direction) — needed for the stroke data.
- Packaging approach for Android later (PWA, Capacitor, or other).
- Graphify (context tool) requested: confirm which tool; add once there is more code.
