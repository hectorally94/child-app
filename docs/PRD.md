# Product Requirements Document (PRD)
## Home Learning Companion for Young Children

**Document status:** Draft v1.0  
**Product status:** Concept → Product Definition  
**Initial target:** Children aged 3–6, starting with a 4-year-old child in Burundi  
**Initial platform:** Android-first responsive application, with web support where practical  
**Primary languages:** To be confirmed; architecture must support Kirundi, French, and English  
**Primary user:** Child  
**Secondary user:** Parent / caregiver  
**Future user:** Teacher

---

# 1. Product Overview

## 1.1 Product idea

The product is a home learning companion that helps young children practice foundational school skills at home through short, guided, interactive activities.

The core problem is simple:

> A child comes home needing to practice something taught at school, but the parent may not have been present when the teacher demonstrated exactly how to do it.

The application bridges that gap by demonstrating the activity, guiding the child through practice, observing the attempt where technically reliable, providing appropriate help, and showing the parent what was practiced.

The product is **not intended to replace school or the teacher**. It is a home practice companion.

---

# 2. Problem Statement

Parents of young children can face several difficulties:

- They know what the child needs to learn but not necessarily how the teacher demonstrated it.
- Children may struggle to explain what they were taught.
- A parent may repeat an explanation in a way that differs from the classroom method.
- Young children need repetition and immediate guidance.
- Passive video consumption can easily replace active practice.
- Parents need a simple way to understand what the child practiced and where additional help may be useful.
- Internet connectivity may not always be reliable enough for continuous streaming.

### Example problem

A child needs to learn how to write `0`.

The teacher demonstrated:

1. where to start;
2. which direction to move;
3. how to complete the shape;
4. how to repeat the movement.

At home, the child remembers that she has to write `0`, but cannot clearly explain the teacher's instructions.

The parent therefore has to guess how to reproduce the lesson.

The application should recreate the instructional sequence.

---

# 3. Product Vision

## Vision

Create a safe, simple, interactive home learning environment where a young child can practice foundational skills independently while a parent remains informed and involved.

## Product promise

> Show the child what to do, let the child try, help when needed, and make progress visible to the parent.

## Core learning loop

**Show → Try → Observe → Help → Try again → Celebrate → Continue**

This loop is the foundation of the product.

---

# 4. Product Principles

## 4.1 Demonstrate before asking

The application should normally show and explain a task before expecting the child to perform it.

## 4.2 One small task at a time

A four-year-old should not be presented with a complex dashboard or a long lesson.

## 4.3 Active learning over passive consumption

The child should interact by:

- tracing;
- drawing;
- tapping;
- selecting;
- counting;
- speaking;
- listening;
- matching;
- arranging;
- repeating.

## 4.4 Encourage rather than punish

Errors are expected.

The application should avoid shame, negative scoring, or language that makes a young child feel unsuccessful.

## 4.5 Parent as supporter

The application should reduce the amount of teaching preparation required from the parent without attempting to remove the parent from the learning process.

## 4.6 Curriculum alignment

Lesson instructions must be configurable so that the product can match the child's school methodology where necessary.

## 4.7 Offline-first learning

Once content is downloaded, the core learning experience should not require continuous internet access.

## 4.8 Privacy by design

Children's information, recordings, and learning history must be handled with strong privacy protections.

---

# 5. Target Users

## 5.1 Primary user: Child

### Initial age range

3–6 years.

### Initial focus

A 4-year-old child who is beginning to develop:

- handwriting;
- number recognition;
- counting;
- vocabulary;
- listening;
- speaking;
- early reading;
- visual recognition;
- fine motor skills.

### Child characteristics

The child may:

- have limited reading ability;
- not understand complex navigation;
- need spoken instructions;
- lose attention quickly;
- repeat activities several times;
- make frequent mistakes;
- need encouragement;
- have developing speech.

---

# 5.2 Secondary user: Parent / caregiver

The parent needs to:

- choose or assign activities;
- understand what the activity teaches;
- see demonstrations;
- monitor progress;
- help when the child is struggling;
- manage languages and settings;
- download lessons;
- control child access.

---

# 5.3 Future user: Teacher

A future version may allow teachers to:

- recommend activities;
- identify topics for home practice;
- share lesson instructions;
- optionally provide curriculum-aligned content.

Teacher functionality is outside the initial MVP.

---

# 6. Initial Product Scope

The first product should focus on one excellent learning experience rather than attempting to implement a complete educational platform.

## MVP learning scope

### Writing

- Number 0
- Number 1
- Number 2
- Basic lines and curves

### Initial lesson

**Learn to write 0**

The first complete lesson is the primary validation experiment.

---

# 7. MVP User Journey

## Parent journey

1. Parent opens the application.
2. Parent enters Parent Mode.
3. Parent creates/selects the child profile.
4. Parent selects "Writing".
5. Parent selects "Number 0".
6. Parent can preview the lesson.
7. Parent downloads the lesson if necessary.
8. Parent gives the device to the child.
9. Child enters Child Mode.
10. Child completes the activity.
11. Parent returns to Parent Mode.
12. Parent sees the practice result.

---

## Child journey

1. Child sees a friendly welcome screen.
2. Child sees today's activity.
3. Application says what to do.
4. Application demonstrates.
5. Child traces.
6. Application gives encouragement.
7. Child writes independently.
8. Application detects whether the attempt can be evaluated.
9. If appropriate, application gives a hint.
10. Child tries again.
11. Activity is completed.
12. Child receives a simple celebration.
13. Application suggests the next activity.

---

# 8. First Lesson: Writing 0

## 8.1 Lesson objective

The child should practice:

- recognizing the number 0;
- identifying the starting point;
- following the intended stroke direction;
- tracing 0;
- attempting to write 0 independently.

## 8.2 Lesson structure

### Step 1 — Introduction

Display:

# 0

Voice:

> "This is zero."

The child can hear the pronunciation.

### Step 2 — Demonstration

Display a large 0.

Show:

- starting dot;
- stroke direction;
- animated drawing;
- optional animated hand.

Voice:

> "Start here. Follow the line around."

The exact wording should be configurable by language and curriculum.

### Step 3 — Guided tracing

The child traces along the guide.

The system records:

- whether the child touched the activity;
- approximate path;
- completion;
- number of attempts;
- whether assistance was requested.

### Step 4 — Independent attempt

Remove or reduce the guide.

The child writes 0 independently.

### Step 5 — Feedback

Possible outcomes:

**Successful attempt**

> "Great! You did it."

**Needs another attempt**

> "Let's try again."

**Child appears stuck**

> "Look at the starting dot."

The system should avoid claiming high-confidence educational judgments when its detection is uncertain.

### Step 6 — Completion

Display a simple celebration.

Example:

> "You practiced zero!"

Then offer:

- Try again
- Next activity
- Finish

---

# 9. Learning Areas

The product will eventually contain the following learning areas.

## 9.1 Writing and fine motor skills

- Lines
- Curves
- Shapes
- Numbers
- Uppercase letters
- Lowercase letters
- Tracing
- Free writing
- Simple words

## 9.2 Early mathematics

- Counting
- Number recognition
- Quantity matching
- More / less
- Sorting
- Sequencing
- Simple addition using objects

## 9.3 Language and speaking

- Vocabulary
- Listening
- Repetition
- Object naming
- Simple questions
- Pronunciation practice
- Songs and rhymes

## 9.4 Early reading

- Letter recognition
- Letter sounds
- Sound matching
- Picture-word association
- Simple words
- Short sentences

## 9.5 Discovery and thinking

- Colors
- Shapes
- Memory
- Matching
- Classification
- Spatial concepts
- Basic problem solving

## 9.6 Stories

- Short narrated stories
- Picture comprehension
- Listening questions
- Character/object recognition
- Simple sequence questions

---

# 10. Child Mode Requirements

Child Mode is the primary interface.

## Requirements

### Navigation

- Large touch targets.
- Minimal text.
- Strong visual cues.
- Spoken instructions where useful.
- No complicated menus.
- No external web browsing.
- No advertising.
- No social features.

### Interaction

The child should be able to:

- tap;
- drag;
- trace;
- draw;
- select;
- speak;
- listen;
- repeat.

### Feedback

Feedback should be:

- short;
- positive;
- understandable;
- age appropriate;
- non-punitive.

---

# 11. Parent Mode Requirements

Parent Mode must be visually and functionally distinct from Child Mode.

## Parent dashboard

Display:

- child name;
- recent activities;
- practice duration;
- attempts;
- completed lessons;
- activities needing additional practice;
- downloaded content;
- language;
- settings.

## Example

### Today's practice

**Writing 0**  
Completed: 5 attempts  
Status: Practiced

**Counting 1–5**  
Completed: 1 activity

**Letter A**  
Needs more practice

The system should avoid presenting a single numerical "intelligence" or "ability" score.

---

# 12. Lesson Content Model

Lessons should be data-driven rather than hard-coded into individual screens.

A lesson should conceptually contain:

```text
Lesson
├── metadata
├── learning objective
├── language variants
├── instructions
├── demonstrations
├── activities
├── hints
├── feedback
├── completion criteria
└── assets
    ├── images
    ├── animations
    ├── audio
    └── optional video
```

## Example conceptual lesson

```json
{
  "id": "writing-number-0",
  "title": {
    "en": "Write 0",
    "fr": "Écrire 0",
    "rn": "..."
  },
  "objective": "Practice writing the number 0",
  "activities": [
    {
      "type": "demonstration"
    },
    {
      "type": "trace",
      "target": "0"
    },
    {
      "type": "free_write",
      "target": "0"
    }
  ]
}
```

The exact schema should be finalized during technical design.

---

# 13. Language Requirements

The product must be internationalization-ready from the beginning.

Initial architecture should allow:

- Kirundi;
- French;
- English.

Language should not be embedded directly into application components.

Every lesson should be able to provide localized:

- title;
- instructions;
- audio;
- feedback;
- hints;
- parent guidance.

The system should allow one language for the child and another language for the parent if required.

---

# 14. Voice and Speech

Speech functionality is a future major feature but should be introduced carefully.

## Initial version

The application can:

- play prerecorded instructions;
- play pronunciation examples;
- record optional child responses;
- allow parent playback.

## Later version

Speech recognition can support:

- repeating words;
- answering simple questions;
- naming objects;
- pronunciation practice.

## Important requirement

Speech recognition must not automatically be treated as an authoritative measure of a young child's pronunciation.

If confidence is low, the system should ask for another attempt rather than reporting a false assessment.

---

# 15. Handwriting Recognition

The handwriting system should initially focus on simple interaction metrics.

## Level 1

Determine:

- Did the child interact?
- Did the child follow the general path?
- Did the child complete the activity?
- How many attempts were made?

## Level 2

Estimate:

- starting position;
- stroke direction;
- distance from guide;
- completion shape.

## Level 3

Adaptive feedback:

- identify repeated difficulty patterns;
- change the hint;
- slow down the demonstration;
- simplify the activity.

The system should avoid pretending to provide professional handwriting assessment.

---

# 16. Adaptive Learning

The product should gradually adapt difficulty.

Example:

### Child succeeds repeatedly

`Trace 0`  
→ `Trace with less guidance`  
→ `Write 0 independently`

### Child struggles

`Write 0`  
→ `Watch demonstration again`  
→ `Trace with stronger guide`  
→ `Try again`

The adaptation should be transparent and understandable to the parent.

---

# 17. Offline Requirements

The child experience should work without continuous internet.

## Downloadable content

A lesson package may include:

- lesson JSON;
- audio;
- images;
- animations;
- interaction definitions.

## Synchronization

When connectivity returns:

- progress is synchronized;
- parent settings are synchronized;
- new lessons can be downloaded.

The system should tolerate interrupted synchronization.

---

# 18. Technical Architecture

## Initial architecture

```text
                 ┌──────────────────┐
                 │   Parent / Child │
                 │      App         │
                 └────────┬─────────┘
                          │
                Local lesson/content
                          │
                 ┌────────▼─────────┐
                 │ Local Progress   │
                 │ & Offline Store  │
                 └────────┬─────────┘
                          │
                    Sync when online
                          │
                 ┌────────▼─────────┐
                 │      API         │
                 └────────┬─────────┘
                          │
             ┌────────────┼────────────┐
             │            │            │
        PostgreSQL    Content       AI/Voice
                      Storage       Services
```

## Recommended initial technology

### Frontend

React + TypeScript.

### Mobile

Android-first packaging, with the architecture kept portable enough for a future Flutter or native mobile implementation if product validation requires it.

### Backend

A conventional REST API.

### Database

PostgreSQL.

### Local storage

A reliable device-side store for:

- lesson packages;
- child progress;
- pending synchronization events.

### Storage

Object storage/CDN for:

- audio;
- images;
- animations;
- lesson assets.

---

# 19. AI Architecture

AI should be an optional service layer.

```text
Application
    |
    +-- Learning Engine
    |
    +-- Speech Service
    |
    +-- Content Assistance
    |
    +-- Adaptive Recommendation
```

The core product must continue functioning if an AI provider is unavailable.

AI should not be required for:

- opening lessons;
- demonstrations;
- tracing;
- basic activities;
- viewing progress;
- offline learning.

---

# 20. Privacy and Child Safety

The product is designed for young children.

## Requirements

- Parent-controlled child profiles.
- No public child profiles.
- No public rankings.
- No targeted advertising.
- No unrestricted external content.
- Minimal personal information.
- Secure authentication for parents.
- Clear data retention rules.
- Ability to delete child-related data.
- Explicit controls for voice recordings.
- Secure transmission of data.
- Secure storage of sensitive data.

Before public release, applicable child privacy and data protection requirements must be reviewed for the countries in which the product operates.

---

# 21. Security Requirements

## Parent authentication

The parent account must protect:

- child profiles;
- progress;
- settings;
- recordings;
- subscription/payment information if introduced later.

## Child mode protection

Child Mode must not expose:

- account credentials;
- parent settings;
- external links;
- payment screens;
- system administration functions.

## Session behavior

A parent should be able to enter Parent Mode through an appropriate parental gate.

---

# 22. Analytics

Analytics should measure product usage without collecting unnecessary child information.

Useful events include:

- lesson_started;
- lesson_completed;
- activity_attempted;
- activity_completed;
- hint_requested;
- lesson_repeated;
- offline_lesson_started;
- synchronization_completed.

Analytics should support product improvement, not surveillance of children.

---

# 23. Non-Functional Requirements

## Performance

- Child screens should load quickly.
- Animations should remain smooth on affordable Android devices.
- Lesson assets should be optimized for mobile networks.
- Offline lessons should open without waiting for the network.

## Reliability

- A temporary network failure must not destroy progress.
- Interrupted downloads must be recoverable.
- Synchronization must be idempotent.

## Accessibility

Consider:

- large visual elements;
- clear contrast;
- audio instructions;
- touch tolerance;
- reduced-motion options where appropriate;
- simple language.

---

# 24. MVP Functional Requirements

## FR-001 — Child profile

The parent can create a child profile.

## FR-002 — Parent mode

The parent can access a protected parent area.

## FR-003 — Child mode

The child can enter the learning experience without seeing parent functionality.

## FR-004 — Lesson catalogue

The parent can browse available lessons.

## FR-005 — Writing lesson

The child can complete the "Write 0" lesson.

## FR-006 — Demonstration

The application demonstrates the correct configured stroke sequence.

## FR-007 — Tracing

The child can trace the number.

## FR-008 — Independent writing

The child can attempt to write the number independently.

## FR-009 — Feedback

The application provides simple feedback.

## FR-010 — Progress

The application records attempts and completion.

## FR-011 — Offline lesson

The lesson can be used after download without continuous connectivity.

## FR-012 — Parent progress

The parent can see whether the child practiced the activity.

## FR-013 — Localization

The lesson architecture supports multiple languages.

---

# 25. MVP Non-Goals

The first release should NOT attempt to implement:

- complete primary-school curriculum;
- teacher management platform;
- social network;
- public leaderboards;
- advertising;
- unrestricted video library;
- complex AI tutor;
- automatic educational diagnosis;
- medical/developmental diagnosis;
- advanced speech scoring;
- full school management;
- payment/subscription system;
- marketplace.

These can be considered later after validating the core learning experience.

---

# 26. UX Requirements

## Child UX

The child should never have to ask:

> "What am I supposed to press?"

The next action should be visually obvious.

## Parent UX

The parent should never have to ask:

> "What exactly is my child supposed to learn here?"

The lesson preview should explain:

- objective;
- demonstration;
- practice method;
- expected behavior;
- how the parent can help.

---

# 27. Content Creation System

The product will eventually require many lessons.

Therefore, lessons should not require a developer to create every activity manually.

A future content system should allow authorized content creators to define:

- lesson objective;
- age range;
- language;
- instructions;
- demonstration;
- interaction;
- hints;
- completion rules;
- assets.

This becomes important once the product grows beyond the first few lessons.

---

# 28. Curriculum Strategy

The product should not invent an educational curriculum without validation.

For the initial stage:

1. Identify what the child is actually learning at school.
2. Collect examples of classroom exercises.
3. Document how the teacher demonstrates them.
4. Convert the exercise into an interactive lesson.
5. Test with the child.
6. Adjust based on observed learning behavior.
7. Expand gradually.

The school curriculum should guide the content structure where possible.

---

# 29. Success Criteria for the First Prototype

The prototype is successful if:

### Child

- understands the task;
- can follow the demonstration;
- can perform the tracing interaction;
- can attempt the task independently;
- remains engaged for a short session.

### Parent

- understands what the lesson teaches;
- does not need to reconstruct the teacher's instructions;
- can see what the child practiced;
- can identify what to practice next.

### Product

- lesson works without continuous internet;
- interaction feels responsive;
- progress survives application restarts;
- content can be changed without rewriting the entire application.

---

# 30. Validation Plan

## Experiment 1 — Writing 0

Use the prototype with the real child.

Test:

- demonstration;
- tracing;
- independent attempt;
- feedback;
- parent dashboard.

Observe without over-directing the child.

## Experiment 2 — Writing 1

Determine whether the lesson structure can be reused.

If adding `1` requires significant new application code, the lesson architecture is too rigid.

## Experiment 3 — Alphabet

Create a letter lesson using the same engine.

The goal is to verify that the learning engine is reusable.

## Experiment 4 — Counting

Create a non-writing activity.

This verifies that the architecture can support different interaction types.

---

# 31. Product Metrics

Early metrics should focus on learning interaction rather than engagement addiction.

Useful measurements:

- lesson completion rate;
- successful independent attempts;
- number of attempts before completion;
- hint usage;
- repeat practice;
- average lesson duration;
- parent return rate;
- offline usage;
- synchronization reliability.

Avoid optimizing for:

- maximum screen time;
- endless sessions;
- number of videos watched;
- compulsive daily engagement.

The goal is effective learning, not maximizing time spent in the application.

---

# 32. Development Phases

## Phase 0 — Product validation

Deliver:

- product specification;
- UX flow;
- first lesson design;
- handwriting interaction prototype.

## Phase 1 — Functional prototype

Deliver:

- child mode;
- parent mode;
- number 0 lesson;
- local progress;
- basic audio;
- basic tracing.

## Phase 2 — Offline MVP

Deliver:

- lesson package;
- local storage;
- offline progress;
- synchronization;
- additional writing lessons.

## Phase 3 — Learning library

Deliver:

- numbers;
- letters;
- shapes;
- counting;
- vocabulary.

## Phase 4 — Language and speech

Deliver:

- multilingual audio;
- speech recording;
- carefully validated speech recognition.

## Phase 5 — Adaptive learning

Deliver:

- difficulty adjustment;
- personalized practice recommendations;
- richer parent insights.

## Phase 6 — Teacher collaboration

Deliver:

- teacher lesson recommendations;
- school-aligned practice;
- optional classroom/home connection.

---

# 33. Initial Screen Map

```text
APP
│
├── Child Mode
│   ├── Welcome
│   ├── Today's Activity
│   ├── Lesson Introduction
│   ├── Demonstration
│   ├── Guided Practice
│   ├── Independent Practice
│   ├── Feedback
│   └── Completion
│
└── Parent Mode
    ├── Parent Authentication / Gate
    ├── Dashboard
    ├── Child Profile
    ├── Lessons
    │   ├── Writing
    │   ├── Numbers
    │   ├── Language
    │   ├── Reading
    │   └── Discovery
    ├── Lesson Preview
    ├── Progress
    ├── Downloads
    ├── Language
    └── Settings
```

---

# 34. Example End-to-End Scenario

## Scenario

A parent wants the child to practice writing zero.

### Parent

Opens Parent Mode.

Selects:

**Writing → Numbers → 0**

The parent sees:

> Objective: Practice recognizing and writing 0.
>
> The lesson demonstrates the starting point and stroke direction before guided tracing.

Parent downloads the lesson.

### Child

The child opens Child Mode.

The application says:

> "Today we are learning zero."

The number appears.

The application demonstrates the stroke.

The child traces.

The application says:

> "Good. Let's try once more."

The child tries independently.

The lesson completes.

### Parent

The parent opens Progress.

Sees:

> **Writing 0**
>
> Practice completed.
>
> 5 attempts.
>
> The child completed the guided activity.
>
> Independent writing was attempted twice.

The parent can repeat the activity later.

---

# 35. Future Product Possibilities

Once the basic product is validated, it could evolve into a broader platform.

Potential future capabilities:

- personalized learning paths;
- school curriculum alignment;
- teacher-created activities;
- Kirundi-first educational content;
- French and English learning;
- parent-child collaborative activities;
- offline lesson packs;
- child-safe educational stories;
- local cultural content;
- printable exercises;
- teacher/parent communication;
- AI-assisted lesson creation for educators.

These are future opportunities, not MVP requirements.

---

# 36. Product Boundary

The product should remain clearly positioned as:

> **A home learning and practice companion for young children.**

It should not initially position itself as:

- a replacement for teachers;
- a diagnostic tool;
- a medical/developmental assessment;
- a general-purpose AI chatbot for children;
- an entertainment/video platform.

---

# 37. First Development Target

The first implementation target is deliberately small:

## "Write 0"

The developer should be able to launch the application and demonstrate this complete flow:

```text
Parent
  ↓
Create/select child
  ↓
Select Writing
  ↓
Select 0
  ↓
Preview lesson
  ↓
Download lesson
  ↓
Child Mode
  ↓
See 0
  ↓
Hear instruction
  ↓
Watch demonstration
  ↓
Trace 0
  ↓
Write 0
  ↓
Receive feedback
  ↓
Complete lesson
  ↓
Parent sees progress
```

If this flow works well with a real four-year-old, the product has a foundation for expansion.

---

# 38. Final Product Definition

The product is not fundamentally a collection of educational videos.

It is an **interactive learning system**.

Its central difference is:

> **The child does something, and the application guides the child through doing it.**

The first version should prove this principle with one concrete problem:

> **"My child needs to learn how to write 0, but I don't know exactly how the teacher showed her."**

The application should answer that problem directly:

> **"Let me show her, let me guide her, let her practice, and let me show you what happened."**

That is the foundation on which the larger learning product can be built.
