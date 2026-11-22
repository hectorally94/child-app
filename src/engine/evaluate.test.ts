import { describe, expect, it } from 'vitest';
import { evaluateAttempt, followsDirection } from './evaluate';
import { sampleStroke } from './geometry';
import { loadLessons } from '../content';
import type { Point, StrokeDef } from './types';

const zero: StrokeDef = { kind: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.27, ry: 0.38, startAngle: -90, direction: 'ccw' };
const opts = { tolerance: 0.08 };

describe('evaluateAttempt', () => {
  it('accepts a clean trace in the right direction', () => {
    const m = evaluateAttempt([zero], [sampleStroke(zero)], opts);
    expect(m.outcome).toBe('success');
    expect(m.startOk).toBe(true);
    expect(m.directionOk).toBe(true);
  });

  it('accepts the shape but notices the reverse direction', () => {
    const reversed = sampleStroke({ ...zero, direction: 'cw' });
    const m = evaluateAttempt([zero], [reversed], opts);
    expect(m.outcome).toBe('success');
    expect(m.directionOk).toBe(false);
  });

  it('treats a tiny tap as no attempt', () => {
    expect(evaluateAttempt([zero], [[[0.5, 0.5]]], opts).outcome).toBe('no_attempt');
  });

  it('asks to retry when the drawing is far from the guide', () => {
    const line: Point[] = Array.from({ length: 30 }, (_, i) => [0.05 + i * 0.03, 0.95]);
    expect(evaluateAttempt([zero], [line], opts).outcome).toBe('retry');
  });

  it('is uncertain for a half-finished zero', () => {
    const half = sampleStroke(zero).slice(0, 45);
    expect(evaluateAttempt([zero], [half], opts).outcome).toBe('uncertain');
  });

  it('cannot judge direction from very little movement', () => {
    expect(followsDirection(zero, sampleStroke(zero).slice(0, 9))).toBeNull();
  });
});

describe('lesson content', () => {
  const lessons = loadLessons();

  it('has numbers 0 to 15 and letters A to E, in order', () => {
    expect(lessons.map((l) => l.target)).toEqual([
      ...Array.from({ length: 16 }, (_, i) => String(i)),
      'A', 'B', 'C', 'D', 'E',
    ]);
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
  });

  it('every lesson has French and English texts', () => {
    for (const l of lessons) {
      for (const text of [l.title, l.objective, l.parentGuide, l.completion, ...l.activities.map((a) => a.say)]) {
        expect(text.fr, l.id).toBeTruthy();
        expect(text.en, l.id).toBeTruthy();
      }
    }
  });

  it('every stroke stays inside the writing board', () => {
    for (const l of lessons) {
      for (const p of l.strokes.flatMap((s) => sampleStroke(s))) {
        expect(p[0], l.id).toBeGreaterThanOrEqual(0.05);
        expect(p[0], l.id).toBeLessThanOrEqual(0.95);
        expect(p[1], l.id).toBeGreaterThanOrEqual(0.08);
        expect(p[1], l.id).toBeLessThanOrEqual(0.92);
      }
    }
  });

  it('every bundled lesson is usable by the same engine (PRD experiment 2)', () => {
    for (const lesson of loadLessons()) {
      const guide = lesson.strokes.map((s) => sampleStroke(s));
      expect(evaluateAttempt(lesson.strokes, guide, opts).outcome).toBe('success');
      expect(lesson.title.en).toBeTruthy();
    }
  });
});
