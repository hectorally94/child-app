import { dist, isClosed, nearestIndex, sampleStroke } from './geometry';
import type { Point, StrokeDef } from './types';

/**
 * Handwriting evaluation, PRD §15 levels 1–2.
 * Deliberately simple and cautious: when unsure we return "uncertain",
 * which the UI turns into gentle encouragement, never a failure message.
 */
export type Outcome = 'success' | 'retry' | 'uncertain' | 'no_attempt';

export interface AttemptMetrics {
  outcome: Outcome;
  coverage: number; // share of the guide the child went near (0..1)
  offPath: number; // share of the child's points far from the guide (0..1)
  startOk: boolean; // started near the starting dot
  directionOk: boolean | null; // followed the intended direction (null = cannot tell)
  pointCount: number;
}

export interface EvalOptions {
  tolerance: number; // normalized distance counted as "on the line"
}

export function evaluateAttempt(strokes: StrokeDef[], drawn: Point[][], opts: EvalOptions): AttemptMetrics {
  const all = drawn.flat();
  const guide = strokes.flatMap((s) => sampleStroke(s));
  const base: AttemptMetrics = { outcome: 'no_attempt', coverage: 0, offPath: 0, startOk: false, directionOk: null, pointCount: all.length };
  if (all.length < 8) return base;

  const tol = opts.tolerance;
  const covered = guide.filter((g) => all.some((p) => dist(p, g) <= tol)).length;
  const coverage = covered / guide.length;
  const offPath = all.filter((p) => nearestIndex(p, guide).distance > tol * 2).length / all.length;

  const firstGuide = sampleStroke(strokes[0]);
  const startOk = drawn.length > 0 && drawn[0].length > 0 && dist(drawn[0][0], firstGuide[0]) <= tol * 1.6;
  const directionOk = followsDirection(strokes[0], drawn[0] ?? []);

  let outcome: Outcome;
  if (coverage >= 0.75 && offPath <= 0.35) outcome = 'success';
  else if (coverage < 0.35) outcome = 'retry';
  else outcome = 'uncertain';

  return { outcome, coverage, offPath, startOk, directionOk, pointCount: all.length };
}

/** Does the child's first stroke move along the guide in the configured order? */
export function followsDirection(stroke: StrokeDef, line: Point[]): boolean | null {
  if (line.length < 8) return null;
  const guide = sampleStroke(stroke);
  const n = guide.length - (isClosed(stroke) ? 1 : 0);
  let forward = 0;
  let backward = 0;
  let prev = nearestIndex(line[0], guide).index % n;
  for (const p of line.slice(1)) {
    const cur = nearestIndex(p, guide).index % n;
    let d = cur - prev;
    if (isClosed(stroke)) {
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
    }
    if (d > 0) forward += d;
    if (d < 0) backward -= d;
    prev = cur;
  }
  if (forward + backward < n * 0.15) return null; // moved too little to judge
  return forward >= backward * 2;
}
