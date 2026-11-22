import type { Lang } from './types';
import type { SessionRecord } from '../storage/store';

/**
 * Plain-language progress for parents (PRD §11, §34).
 * No scores: a status plus a few observations, hedged where detection is uncertain.
 */
export type Status = 'practiced' | 'needsPractice' | 'inProgress';

export interface LessonSummary {
  lessonId: string;
  sessions: number;
  completed: number;
  attempts: number;
  independentAttempts: number;
  minutes: number;
  lastAt: number;
  status: Status;
  notes: string[];
}

export function summarize(lessonId: string, sessions: SessionRecord[], lang: Lang): LessonSummary | null {
  const mine = sessions.filter((s) => s.lessonId === lessonId);
  if (mine.length === 0) return null;
  const attempts = mine.flatMap((s) => s.attempts);
  const free = attempts.filter((a) => a.activity === 'free_write');
  const trace = attempts.filter((a) => a.activity === 'trace');
  const completed = mine.filter((s) => s.completed).length;
  const ms = mine.reduce((a, s) => a + Math.max(0, (s.endedAt ?? s.startedAt) - s.startedAt), 0);

  const anySuccess = attempts.some((a) => a.outcome === 'success');
  const status: Status = completed === 0 ? 'inProgress' : anySuccess ? 'practiced' : 'needsPractice';

  const fr = lang === 'fr';
  const notes: string[] = [];
  if (trace.some((a) => a.outcome === 'success')) notes.push(fr ? 'A réussi le traçage guidé.' : 'Completed the guided tracing.');
  if (free.length) {
    const ok = free.filter((a) => a.outcome === 'success').length;
    notes.push(fr ? `A essayé d'écrire seul ${free.length} fois (${ok} bien formé${ok > 1 ? 's' : ''}).` : `Tried writing alone ${free.length} time${free.length > 1 ? 's' : ''} (${ok} well formed).`);
  }
  const withStart = attempts.filter((a) => a.activity === 'trace');
  if (withStart.length >= 2) {
    const startRate = withStart.filter((a) => a.startOk).length / withStart.length;
    if (startRate < 0.5) notes.push(fr ? 'Commence souvent ailleurs qu’au point vert. Montrez-lui le point de départ.' : 'Often starts away from the green dot. Point to the starting dot together.');
  }
  const dir = attempts.filter((a) => a.directionOk !== null);
  if (dir.length >= 2 && dir.filter((a) => a.directionOk).length / dir.length < 0.5) {
    notes.push(fr ? 'Semble tourner dans l’autre sens. Refaites la démonstration ensemble.' : 'Seems to go the other way round. Watch the demonstration again together.');
  }
  if (attempts.some((a) => a.hintShown)) notes.push(fr ? 'A reçu un indice.' : 'Received a hint.');

  return {
    lessonId,
    sessions: mine.length,
    completed,
    attempts: attempts.length,
    independentAttempts: free.length,
    minutes: Math.max(1, Math.round(ms / 60000)),
    lastAt: Math.max(...mine.map((s) => s.endedAt ?? s.startedAt)),
    status,
    notes,
  };
}
