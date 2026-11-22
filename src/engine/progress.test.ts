import { describe, expect, it } from 'vitest';
import { loadLessons } from '../content';
import type { AttemptRecord, Child, SessionRecord } from '../storage/store';
import { learningPath, masteredIds, nextInPath, unlockedIds } from './progress';

const lessons = loadLessons();
const child: Child = { id: 'c1', name: 'Amani', childLang: 'fr', todayLessonId: null };
const attempt = (activity: 'trace' | 'free_write', ok: boolean): AttemptRecord => ({
  activity, outcome: ok ? 'success' : 'retry', coverage: 1, offPath: 0, startOk: ok, directionOk: ok, pointCount: 50, hintShown: false, at: 1,
});
const session = (lessonId: string, completed: boolean, freeOk: boolean): SessionRecord => ({
  id: lessonId + completed + freeOk, childId: 'c1', lessonId, startedAt: 1, endedAt: 2, completed,
  attempts: [attempt('trace', true), attempt('free_write', freeOk)],
});

describe('progression', () => {
  it('letters alternate capital and small', () => {
    expect(learningPath(lessons).letters.map((l) => l.target).join('')).toBe('AaBbCcDdEe');
  });

  it('only the first number and the first letter are open at the start', () => {
    const open = unlockedIds(lessons, [], child);
    expect([...open].sort()).toEqual(['writing-letter-a', 'writing-number-0']);
  });

  it('mastering 0 opens 1, but a failed or unfinished 0 does not', () => {
    expect(unlockedIds(lessons, [session('writing-number-0', false, true)], child).has('writing-number-1')).toBe(false);
    expect(unlockedIds(lessons, [session('writing-number-0', true, false)], child).has('writing-number-1')).toBe(false);
    const open = unlockedIds(lessons, [session('writing-number-0', true, true)], child);
    expect(open.has('writing-number-1')).toBe(true);
    expect(open.has('writing-number-2')).toBe(false);
  });

  it('mastering A opens small a', () => {
    const open = unlockedIds(lessons, [session('writing-letter-a', true, true)], child);
    expect(open.has('writing-letter-a-small')).toBe(true);
    expect(open.has('writing-letter-b')).toBe(false);
  });

  it('the parent can unlock everything', () => {
    expect(unlockedIds(lessons, [], { ...child, unlockAll: true }).size).toBe(lessons.length);
  });

  it('mastered lessons are counted per child', () => {
    expect(masteredIds([session('writing-number-0', true, true)], 'other').size).toBe(0);
  });

  it('next after E is nothing, next after 0 is 1', () => {
    const byId = (id: string) => lessons.find((l) => l.id === id)!;
    expect(nextInPath(lessons, byId('writing-number-0'))?.target).toBe('1');
    expect(nextInPath(lessons, byId('writing-letter-e-small'))).toBeNull();
  });
});
