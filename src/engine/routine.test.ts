import { describe, expect, it } from 'vitest';
import { loadShortPacks, shortKey } from '../content/short';
import type { AttemptRecord, SessionRecord } from '../storage/store';
import { currentSlot, dayKey, hardWords, repetitionsOn, sessionWords, slotsDone, streak, weekGrid } from './routine';

const packs = loadShortPacks();
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h, 0).getTime();
const att = (item: string, ok: boolean, when: number): AttemptRecord => ({
  activity: 'speak', outcome: ok ? 'success' : 'retry', coverage: ok ? 1 : 0, offPath: 0, startOk: true,
  directionOk: null, pointCount: 0, hintShown: false, at: when, item,
});
const session = (pack: string, slot: SessionRecord['slot'], when: number, attempts: AttemptRecord[] = [], completed = true): SessionRecord => ({
  id: pack + slot + when, childId: 'c1', lessonId: shortKey(pack), startedAt: when, endedAt: when, completed, slot, attempts,
});

describe('daily routine', () => {
  it('picks the session from the time of day', () => {
    expect(currentSlot(new Date(2026, 10, 22, 8))).toBe('morning');
    expect(currentSlot(new Date(2026, 10, 22, 12))).toBe('afternoon');
    expect(currentSlot(new Date(2026, 10, 22, 16, 59))).toBe('afternoon');
    expect(currentSlot(new Date(2026, 10, 22, 17))).toBe('evening');
  });

  it('knows which sessions were done on a day (only finished ones)', () => {
    const s = [session('famille', 'morning', at(2026, 11, 22, 8)), session('famille', 'evening', at(2026, 11, 22, 19), [], false), session('famille', 'afternoon', at(2026, 11, 21, 15))];
    expect([...slotsDone(s, 'c1', '2026-11-22')]).toEqual(['morning']);
    expect([...slotsDone(s, 'c1', '2026-11-21')]).toEqual(['afternoon']);
    expect(slotsDone(s, 'other', '2026-11-22').size).toBe(0);
  });

  it('builds the last 7 days, oldest first', () => {
    const grid = weekGrid([session('famille', 'morning', at(2026, 11, 22))], 'c1', new Date(2026, 10, 22, 20));
    expect(grid.map((g) => g.day)[0]).toBe('2026-11-16');
    expect(grid[6].day).toBe('2026-11-22');
    expect(grid[6].slots.has('morning')).toBe(true);
    expect(grid[5].slots.size).toBe(0);
  });

  it('counts the streak, and keeps it alive while today is still empty', () => {
    const s = [at(2026, 11, 20), at(2026, 11, 21), at(2026, 11, 22)].map((w) => session('famille', 'morning', w));
    expect(streak(s, 'c1', new Date(2026, 10, 22, 18))).toBe(3);
    expect(streak(s.slice(0, 2), 'c1', new Date(2026, 10, 22, 7))).toBe(2); // today not done yet
    expect(streak(s.slice(0, 2), 'c1', new Date(2026, 10, 23, 7))).toBe(0); // missed a day
  });

  it('counts the words said right on a day', () => {
    const w = at(2026, 11, 22);
    const s = [session('famille', 'morning', w, [att('maman', true, w), att('maman', false, w), att('papa', true, w)])];
    expect(repetitionsOn(s, 'c1', dayKey(w))).toBe(2);
  });

  it('session words: the current pack, plus 2 review words from mastered packs (the hardest first)', () => {
    const w = at(2026, 11, 20);
    const [p0, p1] = packs;
    const hard = p0.words[2].id;
    const easy = p0.words[0].id;
    const done = [session(p0.id, 'morning', w, [att(hard, false, w), att(hard, false, w), att(easy, true, w)])];
    const first = sessionWords(packs, new Set(), [], 'c1');
    expect(first.pack?.id).toBe(p0.id);
    expect(first.words.map((x) => x.id)).toEqual(p0.words.map((x) => x.id));
    expect(first.review.size).toBe(0);
    const second = sessionWords(packs, new Set([shortKey(p0.id)]), done, 'c1');
    expect(second.pack?.id).toBe(p1.id);
    expect(second.words.length).toBe(7);
    expect(second.words[5].id).toBe(hard); // most misses → first review word
    expect(second.review.size).toBe(2);
  });

  it('when every pack is mastered, a session is pure review of 5 words', () => {
    const all = new Set(packs.map((p) => shortKey(p.id)));
    const r = sessionWords(packs, all, [], 'c1');
    expect(r.pack).toBeNull();
    expect(r.words.length).toBe(5);
  });

  it('lists the hard words for the parent', () => {
    const w = at(2026, 11, 22);
    const s = [session('famille', 'morning', w, [att('papi', false, w), att('papi', false, w), att('papi', false, w), att('papa', false, w), att('maman', true, w)])];
    const hard = hardWords(packs, s, 'c1');
    expect(hard.map((h) => [h.word.id, h.misses])).toEqual([['papi', 3]]);
  });
});
