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

  it('refuses a good shape written the wrong way round', () => {
    const reversed = sampleStroke({ ...zero, direction: 'cw' });
    const m = evaluateAttempt([zero], [reversed], opts);
    expect(m.outcome).not.toBe('success');
    expect(m.directionOk).toBe(false);
    expect(m.reason).toBe('direction');
  });

  it('refuses a good shape started far from the green dot', () => {
    const fromBottom = sampleStroke({ ...zero, startAngle: 90 });
    const m = evaluateAttempt([zero], [fromBottom], opts);
    expect(m.outcome).not.toBe('success');
    expect(m.reason).toBe('start');
  });

  it('refuses a scribble that covers the shape but goes everywhere', () => {
    const scribble: Point[] = [];
    for (let i = 0; i < 400; i++) scribble.push([0.15 + 0.7 * ((i * 37) % 100) / 100, 0.1 + 0.8 * ((i * 53) % 100) / 100]);
    const m = evaluateAttempt([zero], [sampleStroke(zero), scribble], opts);
    expect(m.outcome).not.toBe('success');
  });

  it('still says bravo to a slightly wobbly, slightly smaller zero written alone', () => {
    const wobbly = sampleStroke({ ...zero, rx: 0.25, ry: 0.35 }).map(([x, y], i) => [x + 0.02 * Math.sin(i), y + 0.02 * Math.cos(i * 1.7)] as Point);
    expect(evaluateAttempt([zero], [wobbly], { tolerance: 0.11 }).outcome).toBe('success');
  });

  it('treats a tiny tap as no attempt', () => {
    expect(evaluateAttempt([zero], [[[0.5, 0.5]]], opts).outcome).toBe('no_attempt');
  });

  it('asks to retry when the drawing is far from the guide', () => {
    const line: Point[] = Array.from({ length: 30 }, (_, i) => [0.05 + i * 0.03, 0.95]);
    expect(evaluateAttempt([zero], [line], opts).outcome).toBe('retry');
  });

  it('refuses a half-finished zero and says something is missing', () => {
    const half = sampleStroke(zero).slice(0, 45);
    const m = evaluateAttempt([zero], [half], opts);
    expect(m.outcome).toBe('uncertain');
    expect(m.reason).toBe('incomplete');
  });

  it('cannot judge direction from very little movement', () => {
    expect(followsDirection(zero, sampleStroke(zero).slice(0, 9))).toBeNull();
  });
});

describe('lesson content', () => {
  const lessons = loadLessons();

  it('has numbers 0 to 15, capital letters A to E and small letters a to e, in order', () => {
    expect(lessons.map((l) => l.target)).toEqual([
      ...Array.from({ length: 16 }, (_, i) => String(i)),
      'A', 'B', 'C', 'D', 'E',
      'a', 'b', 'c', 'd', 'e',
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

  it('every bundled lesson accepts a perfect trace, in the free-writing tolerance too (PRD experiment 2)', () => {
    for (const lesson of loadLessons()) {
      const guide = lesson.strokes.map((s) => sampleStroke(s));
      expect(evaluateAttempt(lesson.strokes, guide, opts).outcome, lesson.id).toBe('success');
      expect(evaluateAttempt(lesson.strokes, guide, { tolerance: 0.11 }).outcome, lesson.id).toBe('success');
      expect(lesson.title.en).toBeTruthy();
    }
  });
});
