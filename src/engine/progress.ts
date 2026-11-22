import type { Lesson } from './types';
import type { Child, SessionRecord } from '../storage/store';

/**
 * Progression (decision 2026-11-22): a lesson is "mastered" when the child wrote it well on her own
 * (a successful free-writing attempt in a completed session). The next lesson of the same group
 * unlocks only when the previous one is mastered. The parent can unlock everything.
 */

/** Learning order inside each group. Letters alternate capital / small: A, a, B, b, … */
export function learningPath(lessons: Lesson[]): Record<string, Lesson[]> {
  const groups: Record<string, Lesson[]> = {};
  for (const l of lessons) (groups[l.group] ??= []).push(l);
  for (const [g, list] of Object.entries(groups)) {
    list.sort((a, b) =>
      g === 'letters'
        ? a.target.toLowerCase().localeCompare(b.target.toLowerCase()) || (a.target === a.target.toUpperCase() ? -1 : 1)
        : a.order - b.order,
    );
  }
  return groups;
}

export function masteredIds(sessions: SessionRecord[], childId: string | undefined): Set<string> {
  return new Set(
    sessions
      .filter((s) => s.childId === childId && s.completed && (s.mastered || s.attempts.some((a) => a.activity === 'free_write' && a.outcome === 'success')))
      .map((s) => s.lessonId),
  );
}

export function unlockedIds(lessons: Lesson[], sessions: SessionRecord[], child: Child | null): Set<string> {
  if (!child) return new Set();
  if (child.unlockAll) return new Set(lessons.map((l) => l.id));
  const mastered = masteredIds(sessions, child.id);
  const open = new Set<string>();
  for (const path of Object.values(learningPath(lessons))) {
    for (const [i, l] of path.entries()) {
      if (i === 0 || mastered.has(path[i - 1].id)) open.add(l.id);
      else break;
    }
  }
  for (const id of mastered) open.add(id);
  return open;
}

/** The lesson that has to be mastered before `lesson` opens (for the "finish this first" hint). */
export function previousInPath(lessons: Lesson[], lesson: Lesson): Lesson | null {
  const path = learningPath(lessons)[lesson.group] ?? [];
  const i = path.findIndex((l) => l.id === lesson.id);
  return i > 0 ? path[i - 1] : null;
}

/** Next lesson to open after mastering `lesson`. */
export function nextInPath(lessons: Lesson[], lesson: Lesson): Lesson | null {
  const path = learningPath(lessons)[lesson.group] ?? [];
  const i = path.findIndex((l) => l.id === lesson.id);
  return i >= 0 && i + 1 < path.length ? path[i + 1] : null;
}

/** Generic "one after the other" unlocking (word sets, conversation reels). */
export function sequentialUnlocked(keys: string[], mastered: Set<string>, unlockAll = false): Set<string> {
  if (unlockAll) return new Set(keys);
  const open = new Set<string>();
  for (const [i, k] of keys.entries()) {
    if (i === 0 || mastered.has(keys[i - 1])) open.add(k);
    else break;
  }
  for (const k of keys) if (mastered.has(k)) open.add(k);
  return open;
}
