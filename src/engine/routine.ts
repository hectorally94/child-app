import { isShortKey, shortKey, type ShortPack, type ShortWord } from '../content/short';
import type { SessionRecord } from '../storage/store';

/**
 * Daily routine for the short words (decision 2026-11-22): three short sessions a day — morning,
 * afternoon, evening — so the child repeats the same few words many times a day.
 */
export type Slot = 'morning' | 'afternoon' | 'evening';
export const SLOTS: Slot[] = ['morning', 'afternoon', 'evening'];

/** The session that fits the time of day: before noon, before 5 pm, after. */
export function currentSlot(date = new Date()): Slot {
  const h = date.getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

/** Local calendar day, "2026-11-22". */
export function dayKey(ts: number | Date): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const shortSessions = (sessions: SessionRecord[], childId: string | undefined) =>
  sessions.filter((s) => s.childId === childId && isShortKey(s.lessonId));

/** Sessions finished on a day, by time of day. */
export function slotsDone(sessions: SessionRecord[], childId: string | undefined, day: string): Set<Slot> {
  const done = new Set<Slot>();
  for (const s of shortSessions(sessions, childId))
    if (s.completed && s.slot && dayKey(s.endedAt ?? s.startedAt) === day) done.add(s.slot);
  return done;
}

/** Last 7 days, oldest first, with the sessions done each day. */
export function weekGrid(sessions: SessionRecord[], childId: string | undefined, today = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const day = dayKey(d);
    return { day, date: d, slots: slotsDone(sessions, childId, day) };
  });
}

/** Days in a row with at least one finished session (today may still be empty). */
export function streak(sessions: SessionRecord[], childId: string | undefined, today = new Date()): number {
  const days = new Set(
    shortSessions(sessions, childId).filter((s) => s.completed).map((s) => dayKey(s.endedAt ?? s.startedAt)),
  );
  const d = new Date(today);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not done yet: the streak is still alive
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Words said right (repetitions) on a day. */
export function repetitionsOn(sessions: SessionRecord[], childId: string | undefined, day: string): number {
  return shortSessions(sessions, childId)
    .flatMap((s) => s.attempts)
    .filter((a) => a.activity === 'speak' && a.outcome === 'success' && dayKey(a.at) === day).length;
}

interface WordStat { misses: number; hits: number; last: number }

function wordStats(sessions: SessionRecord[], childId: string | undefined): Map<string, WordStat> {
  const stats = new Map<string, WordStat>();
  for (const a of shortSessions(sessions, childId).flatMap((s) => s.attempts)) {
    if (!a.item) continue;
    const st = stats.get(a.item) ?? { misses: 0, hits: 0, last: 0 };
    if (a.outcome === 'success') st.hits++;
    else st.misses++;
    st.last = Math.max(st.last, a.at);
    stats.set(a.item, st);
  }
  return stats;
}

/** First pack not mastered yet (the one to practice now), or null when all are done. */
export function currentPack(packs: ShortPack[], mastered: Set<string>): ShortPack | null {
  // The listening game has no words to repeat: it is played from its collection, not in the daily sessions.
  return packs.find((p) => p.kind !== 'listen' && !mastered.has(shortKey(p.id))) ?? null;
}

/**
 * Words of a daily session: the current pack, plus up to two review words from packs already mastered
 * (the ones with the most misses, then the ones practiced longest ago). When every pack is mastered the session
 * is pure review: the 5 hardest / oldest words.
 */
export function sessionWords(
  packs: ShortPack[], mastered: Set<string>, sessions: SessionRecord[], childId: string | undefined,
): { words: ShortWord[]; review: Set<string>; pack: ShortPack | null } {
  const pack = currentPack(packs, mastered);
  const stats = wordStats(sessions, childId);
  const known = packs.filter((p) => p.kind !== 'listen' && mastered.has(shortKey(p.id))).flatMap((p) => p.words);
  const ranked = [...known].sort((a, b) => {
    const sa = stats.get(a.id) ?? { misses: 0, hits: 0, last: 0 };
    const sb = stats.get(b.id) ?? { misses: 0, hits: 0, last: 0 };
    return sb.misses - sa.misses || sa.last - sb.last;
  });
  if (!pack) {
    const words = ranked.slice(0, 5);
    return { words, review: new Set(words.map((w) => w.id)), pack: null };
  }
  const review = ranked.slice(0, 2);
  return { words: [...pack.words, ...review], review: new Set(review.map((w) => w.id)), pack };
}

/** Words that went wrong most often (for the parent). */
export function hardWords(
  packs: ShortPack[], sessions: SessionRecord[], childId: string | undefined, min = 2, limit = 5,
): { word: ShortWord; misses: number }[] {
  const stats = wordStats(sessions, childId);
  return packs
    .flatMap((p) => p.words)
    .map((word) => ({ word, misses: stats.get(word.id)?.misses ?? 0 }))
    .filter((x) => x.misses >= min)
    .sort((a, b) => b.misses - a.misses)
    .slice(0, limit);
}

