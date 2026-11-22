import { dist, isClosed, nearestIndex, sampleStroke } from './geometry';
import type { Point, StrokeDef } from './types';

/**
 * Handwriting evaluation, PRD §15 levels 1–2.
 * "success" means the shape was written well: the whole shape is there, close to the model,
 * started at the green dot and every stroke goes the shown way. Anything else is not a success
 * (decision 2026-11-22: the child must write it well before the next lesson unlocks).
 * "uncertain" = partly right; the UI treats it as "not yet" but with a softer hint.
 */
export type Outcome = 'success' | 'retry' | 'uncertain' | 'no_attempt';

/** Why an attempt was not a success, so the guide can say what to fix. */
export type FailReason = 'start' | 'direction' | 'incomplete' | 'offpath';

export interface AttemptMetrics {
  outcome: Outcome;
  coverage: number; // share of the guide the child went near (0..1)
  offPath: number; // share of the child's points far from the guide (0..1)
  startOk: boolean; // started near the starting dot
  directionOk: boolean | null; // every stroke followed the intended direction (null = cannot tell)
  pointCount: number;
  reason?: FailReason;
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
  // Direction of each stroke, compared in drawing order (stroke 1 with the first line drawn, …)
  const checks = strokes
    .slice(0, drawn.length)
    .map((s, i) => followsDirection(s, drawn[i]))
    .filter((d): d is boolean => d !== null);
  const directionOk = checks.length === 0 ? null : checks.every(Boolean);

  // Scribbling check: much more ink than the model needs means the shape was not really written.
  const guideLength = strokes.reduce((a, s) => a + pathLength(sampleStroke(s)), 0);
  const inkLength = drawn.reduce((a, line) => a + pathLength(line), 0);
  const tooMuchInk = inkLength > guideLength * 1.9 + 0.3;

  const shapeOk = coverage >= 0.75 && offPath <= 0.3 && !tooMuchInk;
  let outcome: Outcome;
  let reason: FailReason | undefined;
  if (shapeOk && startOk && directionOk !== false) outcome = 'success';
  else {
    if (shapeOk && !startOk) reason = 'start';
    else if (shapeOk) reason = 'direction';
    else if ((offPath > 0.3 || tooMuchInk) && coverage >= 0.35) reason = 'offpath';
    else reason = 'incomplete';
    outcome = coverage < 0.35 ? 'retry' : 'uncertain';
  }

  return { outcome, coverage, offPath, startOk, directionOk, pointCount: all.length, reason };
}

/** Does the child's first stroke move along the guide in the configured order? */
export function followsDirection(stroke: StrokeDef, line: Point[]): boolean | null {
  if (line.length < 8) return null;
  const guide = sampleStroke(stroke);
  // A shape that ends where it starts (0, the 0 of 10, O…) wraps around.
  const closed = isClosed(stroke) || dist(guide[0], guide[guide.length - 1]) < 0.03;
  const n = guide.length - (closed ? 1 : 0);
  let forward = 0;
  let backward = 0;
  let prev = nearestIndex(line[0], guide).index % n;
  for (const p of line.slice(1)) {
    const cur = nearestIndex(p, guide).index % n;
    let d = cur - prev;
    if (closed) {
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

function pathLength(line: Point[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += dist(line[i - 1], line[i]);
  return total;
}
