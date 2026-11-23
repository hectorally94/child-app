import type { Lang } from '../engine/types';
import type { AttemptMetrics } from '../engine/evaluate';

/**
 * Local, device-only store (PRD §17, §20). Versioned so the format can be migrated,
 * and shaped as append-only session records so a future sync can be idempotent (by id).
 */
export interface Child {
  id: string;
  name: string;
  childLang: Lang;
  todayLessonId: string | null;
  /** Index into AVATAR_COLORS (profile color). */
  avatar?: number;
  /** Parent switch: open every lesson without having to master the previous one. */
  unlockAll?: boolean;
  /** Speech check before the picture game (default on). */
  checkSpeech?: boolean;
  /** For gendered French sentences ("Je suis content/contente"). */
  gender?: 'f' | 'm';
}

export interface AttemptRecord extends Omit<AttemptMetrics, 'outcome'> {
  outcome: AttemptMetrics['outcome'];
  /** trace / free_write: writing. quiz: "Où est …?" picture game. speak: the child repeated a word or a sentence. */
  activity: 'trace' | 'free_write' | 'quiz' | 'speak';
  hintShown: boolean;
  at: number;
  /** Which word or item was practiced (short words: the word id). */
  item?: string;
}

export interface SessionRecord {
  id: string;
  childId: string;
  lessonId: string;
  startedAt: number;
  endedAt: number | null;
  completed: boolean;
  /** Set when the activity was finished with success (writing alone, perfect quiz, or reel repeated). */
  mastered?: boolean;
  /** Short words: which of the three daily sessions this was. */
  slot?: 'morning' | 'afternoon' | 'evening';
  /** Short words left for later after too many misses. */
  skipped?: string[];
  attempts: AttemptRecord[];
}

/** Parent settings of the "Pause vidéos" feed. */
export interface ReelSettings {
  enabled: boolean;
  /** Length of one break, in minutes. */
  breakMinutes: number;
  /** Most minutes of videos per day. */
  dayMinutes: number;
  /** saved = only clips already saved on the phone (no data); wifi = also stream/save on Wi-Fi; always = any connection. */
  data: 'saved' | 'wifi' | 'always';
}

export interface FamilyVideoMeta {
  id: string;
  title: string;
  bytes: number;
  createdAt: number;
}

export interface AppData {
  version: 1;
  parentLang: Lang;
  reels?: Partial<ReelSettings>;
  /** Seconds watched per child and day ("childId|2026-11-23"), and when each clip was last watched. */
  reelLog?: { seconds: Record<string, number>; seen: Record<string, number> };
  family?: FamilyVideoMeta[];
  /** Fingerprint of the parent code (see pin.ts). No code = multiplication question only. */
  parentPinHash?: string;
  activeChildId: string | null;
  children: Child[];
  sessions: SessionRecord[];
}

const KEY = 'hlc.data.v1';
const EMPTY: AppData = { version: 1, parentLang: 'fr', activeChildId: null, children: [], sessions: [] };

export function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function save(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked: the session continues in memory */
  }
}

export function newId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
