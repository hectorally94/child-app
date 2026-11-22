# CLAUDE.md — project memory

Read this first when starting a new session on this repository.

## What this is
Home Learning Companion: an offline-first, Android-first learning app for children aged 3–6
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

## Planned stack (PRD §18)
React + TypeScript frontend, Android-first packaging, REST API, PostgreSQL, object storage for assets,
reliable on-device store for lessons/progress/pending sync events.

## Current status
- [x] Phase 0: PRD added to repo
- [ ] Phase 0: UX flow, first lesson design, handwriting interaction prototype
- [ ] Phase 1: child mode, parent mode, "Write 0" lesson, local progress, basic audio, basic tracing

## Decisions log
- (none yet — record important decisions here with a date)

## Open questions
- Primary language for the first prototype (Kirundi / French / English)?
- How the child's teacher demonstrates writing 0 (start point, direction) — needed for the stroke data.
- Packaging approach for Android (PWA, Capacitor, or other).
