/**
 * Standard languages: French and English (decision 2026-11-22).
 * Kirundi can be added later by adding 'rn' here and texts in the lesson files.
 */
export type Lang = 'fr' | 'en';
export const LANGS: Lang[] = ['fr', 'en'];

/** A text that may be provided in several languages. Missing languages fall back. */
export type Localized = Partial<Record<Lang, string>>;

export type Point = [number, number]; // normalized 0..1 coordinates

export type StrokeDef =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; startAngle: number; direction: 'cw' | 'ccw' }
  | { kind: 'polyline'; points: Point[] };

export type Activity =
  | { type: 'intro'; say: Localized }
  | { type: 'demonstration'; say: Localized }
  | { type: 'trace'; guide: 'strong' | 'faint'; maxAttempts: number; say: Localized }
  | { type: 'free_write'; guide: 'faint' | 'none'; maxAttempts: number; say: Localized };

export type FeedbackKey = 'success' | 'retry' | 'uncertain' | 'hintStart' | 'moveOn';

export interface Lesson {
  id: string;
  version: number;
  /** Position in the lists shown to the child and the parent. */
  order: number;
  area: 'writing' | 'numbers' | 'language' | 'reading' | 'discovery';
  group: 'numbers' | 'letters' | string;
  ageRange: [number, number];
  /** Extra writing line: 'midline' adds the middle line used for lowercase letters. */
  guideLines?: 'basic' | 'midline';
  target: string;
  title: Localized;
  objective: Localized;
  parentGuide: Localized;
  strokes: StrokeDef[];
  activities: Activity[];
  feedback: Record<FeedbackKey, Localized>;
  completion: Localized;
}
