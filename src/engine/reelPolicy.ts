import type { FeedItem, FamilyReel, ReelVideo } from '../content/reels';
import { dayKey } from './routine';
import type { AppData, ReelSettings } from '../storage/store';

/**
 * Rules of the "Pause vidéos" feed (decision 2026-11-23): short breaks, a daily maximum, data-friendly, parent in control.
 * Nothing here is social or personalized: no likes, comments, followers, ads or recommendations from outside.
 */
export const DEFAULT_REEL_SETTINGS: ReelSettings = { enabled: true, breakMinutes: 5, dayMinutes: 20, data: 'wifi' };
export const BREAK_CHOICES = [3, 5, 10, 15];
export const DAY_CHOICES = [10, 20, 30, 60];

export const reelSettings = (d: Pick<AppData, 'reels'>): ReelSettings => ({ ...DEFAULT_REEL_SETTINGS, ...d.reels });

const usageKey = (childId: string, day: string) => `${childId}|${day}`;

export function secondsWatched(d: Pick<AppData, 'reelLog'>, childId: string, day = dayKey(new Date())): number {
  return d.reelLog?.seconds?.[usageKey(childId, day)] ?? 0;
}

/** Seconds of video the child may still watch today. */
export function remainingToday(d: Pick<AppData, 'reels' | 'reelLog'>, childId: string, day = dayKey(new Date())): number {
  return Math.max(0, reelSettings(d).dayMinutes * 60 - secondsWatched(d, childId, day));
}

/** Length of the next break: the break length, or what is left of the day. */
export function nextBreakSeconds(d: Pick<AppData, 'reels' | 'reelLog'>, childId: string, day = dayKey(new Date())): number {
  return Math.min(reelSettings(d).breakMinutes * 60, remainingToday(d, childId, day));
}

export function addSeconds(d: AppData, childId: string, seconds: number, day = dayKey(new Date())): AppData {
  const log = d.reelLog ?? { seconds: {}, seen: {} };
  const key = usageKey(childId, day);
  return { ...d, reelLog: { ...log, seconds: { ...log.seconds, [key]: (log.seconds[key] ?? 0) + seconds } } };
}

export function markSeen(d: AppData, id: string, at = Date.now()): AppData {
  const log = d.reelLog ?? { seconds: {}, seen: {} };
  return { ...d, reelLog: { ...log, seen: { ...log.seen, [id]: at } } };
}

/** Can the app use the internet for videos right now? (Some phones do not say whether it is Wi-Fi.) */
type NavLike = Pick<Navigator, 'onLine'> & { connection?: { type?: string; saveData?: boolean } };

export function networkAllowed(policy: ReelSettings['data'], nav?: NavLike): boolean {
  const n: NavLike | undefined = nav ?? (typeof navigator !== 'undefined' ? (navigator as unknown as NavLike) : undefined);
  if (!n || n.onLine === false) return false;
  if (policy === 'saved') return false;
  if (policy === 'always') return true;
  const c = n.connection;
  if (!c) return true; // the browser does not say (iPhone…): we do not block
  if (c.saveData) return false;
  if (c.type) return c.type === 'wifi' || c.type === 'ethernet';
  return true;
}

/**
 * What to show in a break: family videos and clips that can be played now (saved, or the internet may be used),
 * the ones watched longest ago first, family videos before our clips on a tie. At most `limit`.
 */
export function buildFeed(
  catalog: ReelVideo[], family: FamilyReel[], saved: Set<string>, internet: boolean, seen: Record<string, number>, limit = 12,
): FeedItem[] {
  const playable: FeedItem[] = [
    ...family,
    ...catalog.filter((v) => internet || saved.has(v.src) || (v.srcWebm != null && saved.has(v.srcWebm))),
  ];
  return playable
    .map((item, i) => ({ item, i, seen: seen[item.id] ?? 0 }))
    .sort((a, b) => a.seen - b.seen || (a.item.kind === 'family' ? 0 : 1) - (b.item.kind === 'family' ? 0 : 1) || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.item);
}
