import type { Lesson } from '../engine/types';

/**
 * Lessons are plain JSON files in ./lessons. Adding a new lesson = adding a file,
 * no application code (PRD §12, §30 experiment 2).
 * Bundled lessons are part of the app, so they work offline once the app is loaded.
 */
const modules = import.meta.glob<Lesson>('./lessons/*.json', { eager: true, import: 'default' });

export function loadLessons(): Lesson[] {
  return Object.values(modules).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function getLesson(id: string): Lesson | undefined {
  return loadLessons().find((l) => l.id === id);
}
