import type { Point, StrokeDef } from './types';

/** Turn a stroke definition into evenly spaced points, in drawing order. */
export function sampleStroke(s: StrokeDef, n = 80): Point[] {
  if (s.kind === 'ellipse') {
    const sign = s.direction === 'ccw' ? -1 : 1; // screen y points down, so ccw = decreasing angle
    const a0 = (s.startAngle * Math.PI) / 180;
    const pts: Point[] = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + sign * (i / n) * 2 * Math.PI;
      pts.push([s.cx + s.rx * Math.cos(a), s.cy + s.ry * Math.sin(a)]);
    }
    return pts;
  }
  // polyline: distribute n points along total length
  const segs = s.points.slice(1).map((p, i) => dist(s.points[i], p));
  const total = segs.reduce((a, b) => a + b, 0);
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    let d = (i / n) * total;
    let k = 0;
    while (k < segs.length - 1 && d > segs[k]) d -= segs[k++];
    const t = segs[k] === 0 ? 0 : Math.min(1, d / segs[k]);
    const [a, b] = [s.points[k], s.points[k + 1]];
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return pts;
}

export function isClosed(s: StrokeDef): boolean {
  return s.kind === 'ellipse';
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function nearestIndex(p: Point, pts: Point[]): { index: number; distance: number } {
  let index = 0;
  let distance = Infinity;
  pts.forEach((q, i) => {
    const d = dist(p, q);
    if (d < distance) {
      distance = d;
      index = i;
    }
  });
  return { index, distance };
}
