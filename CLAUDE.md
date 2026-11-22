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
- **i18n from day one**: French (`fr`, default) and English (`en`); no strings inside components. Child and parent languages can differ. Kirundi can be added later.
- AI is optional; core features never depend on it.
- Privacy: minimal child data, no ads, no social features, no external links in Child Mode, parental gate for Parent Mode.
- Never present a single "ability" score; don't claim confident judgments when detection is uncertain.

## Stack
- Now: React 18 + TypeScript + Vite + **Tailwind CSS v4** (`@tailwindcss/vite`) + **Framer Motion** for animation.
  No backend. Data in `localStorage` (device only).
  Service worker (`public/sw.js`) caches the app for offline use in production builds.
- Later (PRD §18): REST API, PostgreSQL, object storage, sync of progress; Android packaging.

## Repository & deploy
- GitHub: https://github.com/hectorally94/child-app (public, branch `main`).
- Vercel: project `child-app` linked to the repo; every push to `main` deploys. Live: https://child-app-lime.vercel.app

## Commands
- `npm install` then `npm run dev` (local dev server)
- `npm test` (Vitest), `npm run typecheck`, `npm run build` (outputs `dist/`)
- Deploy for testing: Vercel (Vite preset, output `dist`).

## Code map
- `src/content/lessons/*.json` — lessons (data). New lesson = new JSON file, no code. `order` sets the list position;
  `group` is `numbers` or `letters`. Lessons now: numbers 0–15, capital letters A–E, small letters a–e
  (print/script lowercase, `guideLines: "midline"` adds the middle writing line at y=0.46).
- `tools/generate_lessons.py` — helper that computes stroke points (curves, two-digit numbers, letters) and writes
  lesson JSON for 3–15, A–E and a–e. 0, 1, 2 are hand-written. Re-run after changing a shape, then `npm test`.
- `src/engine/` — lesson types, stroke geometry, attempt evaluation (`evaluate.ts`), parent summary, speech (device TTS).
- `src/modes/` — `ChildMode` (lesson player), `ParentGate` (multiplication gate), `ParentMode` (dashboard, lessons, settings).
- `src/components/Slate.tsx` — writing board (canvas): guide, demo animation, captures strokes.
- `src/components/` — also `Mascot` (Pipo), `Decor` (blobs, confetti), `Icon` (single icon set),
  `Avatar` (profile colors), `InstallCard` (install-the-app card, parent side only).
- `src/pwa/install.ts` — captures `beforeinstallprompt` (imported first in `main.tsx`); iPhone gets instructions instead.
- `public/` — `manifest.webmanifest`, PNG icons (192, 512, maskable 512, apple-touch 180), `sw.js` (offline cache).
- **Speaking spaces** (2026-11-22): `src/content/words/sets.json` (9 sets × 4 daily words: animals, kitchen, house,
  things, me, food) and `src/content/talk/reels.json` (25 conversation reels with Pipo and Tika in 5 themes: greet, needs (incl. toilet),
  feelings, polite, house rooms; each theme unlocks on its own, its first reel is open; `{name}` and `{e}` (girl form,
  `child.gender`) are filled by `personalize`), loaded by
  `src/content/speak.ts`. Pictures: `public/pictures/<code>.svg` (Twemoji CC-BY 4.0, credited in Paramètres; `table.svg`
  is ours). Players: `src/modes/WordsPlayer.tsx` (learn: picture → word → sentence → child repeats; quiz "Où est … ?"
  with 3 pictures — a set is mastered only after a perfect quiz round) and `src/modes/TalkReels.tsx` (vertical reels,
  swipe up/down with a pan gesture — NOT framer `drag`, which reset the layer position on re-render).
- `src/components/SpeakButton.tsx` + `src/engine/voice.ts` — microphone. **Pronunciation check (default on,
  `child.checkSpeech`)**: browser speech recognition (`recognize`, fr-FR, 5 alternatives; needs internet, the phone's
  service — Google on Android — receives the voice) + tolerant matcher `src/engine/pronounce.ts` (accents, articles,
  homophones ignored; words need every key word, sentences ≥ 60 %, child's name not required). Wrong → "Faux. J'ai
  entendu « … ». Écoute bien : …" and Pipo repeats slowly (rate 0.6); right → "Bravo ! Tu as bien dit : …".
  The picture game starts only after every word was said right. If recognition is unavailable (offline, unsupported,
  refused) or the check is off → fallback "she spoke" (voice level) + her voice played back. No mic → "Je l'ai dit !".
  Recordings are never saved.
- `src/engine/speech.ts` — `speak`, `speakAsync` (resolves when a line ends; reels take turns: Pipo pitch 1.05,
  Tika pitch 1.45), `speakFeedback` (Bravo/Faux), `playSound`, `primeAudio`.
- Sessions use `lessonId` = lesson id, `words:<setId>` or `talk:<reelId>`; `mastered: true` on success.
- `src/i18n/` — UI strings + fallback (`fr` ↔ `en`).
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
- **Two layouts** (2026-11-22): phones / short screens (`max-width: 639px` or `max-height: 720px`, see `useCompact` in
  ChildMode) get a compact layout; wider screens keep the web layout the user loves. Child mode is exactly one screen
  tall (`h-dvh`, safe-area padding for notches); the lesson board sizes itself with a size container
  (`width: min(100cqw, 100cqh)`) so it never overflows. Test phone fit at 320×568, 360×640, 375×667.
- Profile: tap the child's name/avatar in the parent header (pencil badge) → profile editor (first name, avatar color).
- **Addresses**: `/` = child space, `/parent` = parent space (always behind the gate). Handled in `App.tsx` with the
  History API (no router library); `vercel.json` rewrites every non-file path to `index.html`; manifest has a
  "Espace parent" shortcut. Back button switches between the two.
- **Parent code**: 4-digit PIN (`src/storage/pin.ts`, only a SHA-256 fingerprint `parentPinHash` is stored) asked on a
  big keypad (`PinPad`). No code → multiplication question. "Code oublié ?" → multiplication removes the code.
  Created/changed/removed in Paramètres → "Code parent"; the dashboard suggests creating one until it exists.
- Dashboard starts with "Progression des enfants": one card per child with progress bars (numbers x/16, letters x/10
  mastered). Tapping a card makes that child active.

## Current status
- [x] Phase 0: PRD added to repo
- [x] Phase 1 prototype: child mode, parent gate + mode, "Write 0" and "Write 1" lessons, tracing with
      demonstration, independent writing, cautious feedback, local progress, device TTS audio, EN/FR
- [x] First test with the real child (2026-11-22): parent loves the UI, the child liked it. Keep this design direction.
- [ ] Observe more sessions; adjust stroke data to match the teacher's method
- [x] UI v2: Tailwind + claymorphism + mascot + animations; adaptive demo replay after 2 missed traces; "Write 2" lesson
- [x] v3 (2026-11-22): numbers 3–15 and letters A–E; child home has a free-choice grid (123 / ABC tabs, star on
      completed lessons, today's activity highlighted); profile (name + avatar color, "who's playing?" switch);
      installable PWA (Chrome installability check passes); numbered start dots for multi-stroke shapes
- [x] v4 (2026-11-22): strict success check with spoken Bravo/Faux + sounds; lessons unlock one by one; parent sees
      Maîtrisé / À retravailler with "x réussis · y faux"; phone layout; easy profile name editing
- [x] v5 (2026-11-22): `/parent` address, parent code (PIN), progress bars per child
- [x] v6 (2026-11-22): speaking practice for the daughter (6 years old, speech delay in French): "Mots" (daily words
      with pictures, repeat + picture game) and "Parler" (original conversation reels replacing YouTube cartoons);
      both unlock one by one; parent sees Mots x/9, Conversations x/10 and "A parlé N fois"
- [x] v7 (2026-11-22): pronunciation check ("miaou" ≠ "le chat"); 15 new conversations (toilet, tired, cold, wash
      hands, scared, I love you, yes/no, please, sorry, rooms of the house…) grouped by theme; Fille/Garçon in profile
      — tested at home by the parent: "it works fine" (2026-11-22)
- [ ] Prerecorded audio (device TTS for now)
- [ ] Phase 2: lesson packages/download, backend + sync, more writing lessons

## Decisions log
- 2026-11-22: Start as a **web app** (not mobile). Android packaging later.
- 2026-11-22: UI v1 (slate/chalk) replaced by UI v2 (claymorphism + mascot) at the user's request.
- 2026-11-22: Default stroke for 0: start at top, counter-clockwise (common school convention). Change in the lesson JSON if the teacher differs.
- 2026-11-22 (replaces the earlier "cautious, move on kindly" rule, at the user's request): **strict progression**.
  Success = whole shape (coverage ≥ 0.75, little off-path, no scribbling) + started at the green dot + every stroke in
  the shown direction. Otherwise Pipo says "Faux" + the reason (start / direction / missing piece / off the model).
  Tracing must succeed to go on (demo replays every 2 misses); writing alone must succeed; after 3 misses alone the
  child goes back to tracing. Celebration only after a real success.
- 2026-11-22: **Unlocking**: a lesson is *mastered* when written well alone (`src/engine/progress.ts`). Next lesson in
  the same group opens only then. Paths: numbers 0→15; letters A→a→B→b→…→e. Parent switch "Tout débloquer"
  (`child.unlockAll`). Locked tiles show the grey number + padlock; tapping one makes Pipo say which to finish first.
- 2026-11-22: Voice feedback: "Bravo !" (higher, joyful) and "Faux !" (calm) are spoken as a separate first word,
  with a short chime / soft "boing" made by Web Audio (`speakFeedback`, `playSound`). Audio is unlocked on the first
  touch (`primeAudio`) because phones block sound until a user gesture.
- 2026-11-22: No backend yet; all data stays on the device.
- 2026-11-22: Test deployments go to Vercel (via the Vercel MCP), connected to the GitHub repo.
- 2026-11-22: GitHub repo name: **child-app** (public).
- 2026-11-22: Languages: **French (default) and English** are the standard. Kirundi postponed.
- 2026-11-22: Stack confirmed by user: React + Tailwind CSS, with animations.
- 2026-11-22: Teacher method improvised: 0 = start top, counter-clockwise; 1 = small stroke up then straight down;
  2 = start left, round back over the top, slide down-left, straight base line.
- 2026-11-22: The child chooses freely what to practice (grid on the child home). "Next activity" just opens the next
  lesson; it no longer changes the parent's "today's activity".
- 2026-11-22: Letters come in capital AND lowercase (user request). Lowercase uses print letters; switch to cursive
  if the school teaches cursive. Child grid shows capitals on one row, lowercase below (5 columns).
- 2026-11-22: The daughter is 6 (earlier notes said 4) and has a speech delay in French; the parent wants the app to
  replace YouTube. Added speaking spaces with ORIGINAL characters (no copyrighted cartoons). Speaking is rewarded,
  never marked "Faux"; only the picture game says Faux. Child home tabs: 123 · ABC · Mots · Parler.
- 2026-11-22 (replaces "speaking is never graded", at the parent's request): words must be pronounced right before
  the game ("miaou" was accepted for "le chat"). Recognition is tolerant and can be switched off by the parent.
  Existing Parler conversations are kept; new ones are ADDED (the parent asked not to remove anything).
- 2026-11-22: The daughter perceives Pipo's voice as "the teacher (madam)". Keep the guide voice warm and teacher-like.

## Open questions
- Packaging approach for Android later (PWA, Capacitor, or other).
- Graphify (context tool) requested: confirm which tool; add once there is more code.
- UI/UX Pro Max skill is not vendored into `.claude/skills/` (needs the user's permission to install a downloaded skill).
