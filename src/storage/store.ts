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
}

export interface AttemptRecord extends AttemptMetrics {
  activity: 'trace' | 'free_write';
  hintShown: boolean;
  at: number;
}

export interface SessionRecord {
  id: string;
  childId: string;
  lessonId: string;
  startedAt: number;
  endedAt: number | null;
  completed: boolean;
  attempts: AttemptRecord[];
}

export interface AppData {
  version: 1;
  parentLang: Lang;
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
