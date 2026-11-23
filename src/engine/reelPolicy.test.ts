import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FamilyReel, ReelVideo } from '../content/reels';
import type { AppData } from '../storage/store';
import { addSeconds, buildFeed, markSeen, nextBreakSeconds, networkAllowed, remainingToday, reelSettings, secondsWatched } from './reelPolicy';

const empty = (): AppData => ({ version: 1, parentLang: 'fr', activeChildId: null, children: [], sessions: [] });
const vid = (id: string, extra: Partial<ReelVideo> = {}): ReelVideo => ({
  id, kind: 'video', src: `/reels/${id}.mp4`, srcWebm: `/reels/${id}.webm`, seconds: 20, bytes: 1000, title: { fr: id }, audio: false, cues: [], ...extra,
});
const fam = (id: string): FamilyReel => ({ kind: 'family', id: `family:${id}`, title: id, bytes: 1000, createdAt: 1 });

describe('time limits', () => {
  it('has sensible defaults: 5-minute breaks, 20 minutes a day, Wi-Fi only', () => {
    expect(reelSettings(empty())).toEqual({ enabled: true, breakMinutes: 5, dayMinutes: 20, data: 'wifi' });
  });

  it('counts the seconds watched per child and day', () => {
    let d = empty();
    d = addSeconds(d, 'a', 60, '2026-11-23');
    d = addSeconds(d, 'a', 30, '2026-11-23');
    d = addSeconds(d, 'b', 500, '2026-11-23');
    d = addSeconds(d, 'a', 99, '2026-11-24');
    expect(secondsWatched(d, 'a', '2026-11-23')).toBe(90);
    expect(secondsWatched(d, 'a', '2026-11-24')).toBe(99);
    expect(secondsWatched(d, 'a', '2026-11-25')).toBe(0);
  });

  it('a break is the break length, or what is left of the day, and then nothing', () => {
    let d: AppData = { ...empty(), reels: { breakMinutes: 5, dayMinutes: 8 } };
    expect(nextBreakSeconds(d, 'a', '2026-11-23')).toBe(300);
    d = addSeconds(d, 'a', 300, '2026-11-23');
    expect(remainingToday(d, 'a', '2026-11-23')).toBe(180);
    expect(nextBreakSeconds(d, 'a', '2026-11-23')).toBe(180);
    d = addSeconds(d, 'a', 400, '2026-11-23');
    expect(remainingToday(d, 'a', '2026-11-23')).toBe(0);
    expect(nextBreakSeconds(d, 'a', '2026-11-23')).toBe(0);
    expect(remainingToday(d, 'a', '2026-11-24')).toBe(480); // a new day starts fresh
  });
});

describe('data use', () => {
  const nav = (o: object) => ({ onLine: true, ...o });
  it('never uses the internet when offline, or when the parent chose "saved only"', () => {
    expect(networkAllowed('always', nav({ onLine: false }))).toBe(false);
    expect(networkAllowed('wifi', nav({ onLine: false }))).toBe(false);
    expect(networkAllowed('saved', nav({}))).toBe(false);
  });
  it('"always" uses any connection', () => {
    expect(networkAllowed('always', nav({ connection: { type: 'cellular' } }))).toBe(true);
  });
  it('"Wi-Fi only" refuses mobile data and data-saver mode, accepts Wi-Fi, and does not block when the phone does not say', () => {
    expect(networkAllowed('wifi', nav({ connection: { type: 'cellular' } }))).toBe(false);
    expect(networkAllowed('wifi', nav({ connection: { type: 'wifi', saveData: true } }))).toBe(false);
    expect(networkAllowed('wifi', nav({ connection: { type: 'wifi' } }))).toBe(true);
    expect(networkAllowed('wifi', nav({ connection: {} }))).toBe(true);
    expect(networkAllowed('wifi', nav({}))).toBe(true);
  });
});

describe('what the feed shows', () => {
  const catalog = [vid('a'), vid('b'), vid('c')];

  it('offline or saved-only: family videos and saved clips only', () => {
    const feed = buildFeed(catalog, [fam('papa')], new Set(['/reels/b.webm']), false, {});
    expect(feed.map((x) => x.id)).toEqual(['family:papa', 'b']);
  });

  it('with internet: every clip', () => {
    expect(buildFeed(catalog, [], new Set(), true, {}).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('clips watched longest ago come first; family videos win a tie', () => {
    const feed = buildFeed(catalog, [fam('papa')], new Set(), true, { a: 300, 'family:papa': 300, b: 100 });
    expect(feed.map((x) => x.id)).toEqual(['c', 'b', 'family:papa', 'a']);
  });

  it('is limited to a short feed', () => {
    const many = Array.from({ length: 30 }, (_, i) => vid('v' + i));
    expect(buildFeed(many, [], new Set(), true, {}, 12).length).toBe(12);
  });

  it('remembers what was watched', () => {
    expect(markSeen(empty(), 'ferme', 123).reelLog?.seen.ferme).toBe(123);
  });
});

describe('the clips shipped with the app', () => {
  const file = (p: string) => resolve(__dirname, '../../public', p.replace(/^\//, ''));
  const catalog = JSON.parse(readFileSync(file('/reels/catalog.json'), 'utf8')).items as ReelVideo[];

  it('has 8 clips, with unique ids', () => {
    expect(catalog.length).toBe(8);
    expect(new Set(catalog.map((c) => c.id)).size).toBe(8);
  });

  it('every clip has its MP4, WebM and poster files, and the size in the catalog is right', () => {
    for (const c of catalog) {
      for (const f of [c.src, c.srcWebm!, c.poster!]) expect(existsSync(file(f)), `${c.id} ${f}`).toBe(true);
      expect(statSync(file(c.src)).size, c.id).toBe(c.bytes);
      expect(c.bytes, c.id).toBeLessThan(1_500_000); // light enough for mobile data
    }
  });

  it('captions are in order, inside the video, and in French and English', () => {
    for (const c of catalog) {
      expect(c.cues.length, c.id).toBeGreaterThan(5);
      let last = -1;
      for (const q of c.cues) {
        expect(q.t, c.id).toBeGreaterThan(last);
        expect(q.t, c.id).toBeLessThan(c.seconds);
        last = q.t;
        for (const l of [q.show, q.say]) expect(l.fr && l.en, `${c.id} @${q.t}`).toBeTruthy();
      }
      expect(c.title.fr && c.title.en, c.id).toBeTruthy();
      expect(c.audio, c.id).toBe(false); // silent: Pipo says the words
    }
  });
});
