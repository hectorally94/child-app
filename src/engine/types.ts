/** Language codes supported by the architecture (PRD §13). */
export type Lang = 'en' | 'fr' | 'rn';
export const LANGS: Lang[] = ['en', 'fr', 'rn'];

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
  area: 'writing' | 'numbers' | 'language' | 'reading' | 'discovery';
  group: string;
  ageRange: [number, number];
  target: string;
  title: Localized;
  objective: Localized;
  parentGuide: Localized;
  strokes: StrokeDef[];
  activities: Activity[];
  feedback: Record<FeedbackKey, Localized>;
  completion: Localized;
}
