import { useCallback, useEffect, useRef } from 'react';
import { sampleStroke } from '../engine/geometry';
import type { Point, StrokeDef } from '../engine/types';

/**
 * The chalk slate: shows the guide, plays the demonstration, and captures the child's strokes.
 * Coordinates are normalized (0..1) so lessons are independent of screen size.
 */
export type SlateMode = 'show' | 'demo' | 'trace' | 'free';

interface Props {
  strokes: StrokeDef[];
  mode: SlateMode;
  guide: 'strong' | 'faint' | 'none';
  /** Change this number to replay the demonstration or clear the board. */
  resetKey: number;
  /** Called when the child pauses after drawing. */
  onAttempt?: (drawn: Point[][]) => void;
  onDemoEnd?: () => void;
}

const CHALK = '#F7F3E3';
const SUN = '#FFC93C';
const CHILD_CHALK = '#FFE6A8';
const PAUSE_MS = 1100;

export function Slate({ strokes, mode, guide, resetKey, onAttempt, onDemoEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawnRef = useRef<Point[][]>([]);
  const drawingRef = useRef(false);
  const timerRef = useRef<number>();
  const demoProgressRef = useRef(mode === 'demo' ? 0 : 1);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const size = canvas.width;
    const px = (p: Point) => [p[0] * size, p[1] * size] as const;
    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const guides = strokes.map((s) => sampleStroke(s));

    // Dotted chalk guide
    if (guide !== 'none' || mode === 'show' || mode === 'demo') {
      ctx.save();
      ctx.strokeStyle = CHALK;
      ctx.globalAlpha = mode === 'show' ? 0.95 : guide === 'faint' ? 0.18 : 0.45;
      ctx.lineWidth = size * (mode === 'show' ? 0.06 : 0.05);
      if (mode !== 'show') ctx.setLineDash([size * 0.001, size * 0.045]);
      for (const g of guides) {
        ctx.beginPath();
        g.forEach((p, i) => (i ? ctx.lineTo(...px(p)) : ctx.moveTo(...px(p))));
        ctx.stroke();
      }
      ctx.restore();
    }

    // Demonstration: chalk line drawn progressively, with a fingertip dot leading it
    if (mode === 'demo') {
      const total = guides.reduce((a, g) => a + g.length, 0);
      let budget = Math.floor(demoProgressRef.current * total);
      let tip: Point | null = null;
      ctx.save();
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = size * 0.05;
      ctx.shadowColor = CHALK;
      ctx.shadowBlur = size * 0.01;
      for (const g of guides) {
        if (budget <= 0) break;
        const part = g.slice(0, Math.min(g.length, budget));
        budget -= part.length;
        ctx.beginPath();
        part.forEach((p, i) => (i ? ctx.lineTo(...px(p)) : ctx.moveTo(...px(p))));
        ctx.stroke();
        tip = part[part.length - 1];
      }
      ctx.restore();
      if (tip && demoProgressRef.current < 1) drawFingertip(ctx, ...px(tip), size);
    }

    // Starting dot and direction arrow
    if (mode !== 'show' && (guide !== 'none' || mode === 'demo')) {
      guides.forEach((g) => {
        const [x, y] = px(g[0]);
        const [nx, ny] = px(g[Math.min(6, g.length - 1)]);
        drawArrow(ctx, x, y, nx, ny, size);
        ctx.beginPath();
        ctx.fillStyle = SUN;
        ctx.arc(x, y, size * 0.042, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Child's chalk
    ctx.save();
    ctx.strokeStyle = CHILD_CHALK;
    ctx.lineWidth = size * 0.045;
    ctx.shadowColor = CHILD_CHALK;
    ctx.shadowBlur = size * 0.008;
    for (const line of drawnRef.current) {
      ctx.beginPath();
      line.forEach((p, i) => (i ? ctx.lineTo(...px(p)) : ctx.moveTo(...px(p))));
      if (line.length === 1) ctx.lineTo(px(line[0])[0] + 0.1, px(line[0])[1]);
      ctx.stroke();
    }
    ctx.restore();
  }, [strokes, mode, guide]);

  // Keep the canvas sharp at any size
  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      const w = canvas.clientWidth * (window.devicePixelRatio || 1);
      canvas.width = canvas.height = Math.round(w);
      paint();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [paint]);

  // Reset / play demonstration
  useEffect(() => {
    drawnRef.current = [];
    window.clearTimeout(timerRef.current);
    if (mode !== 'demo') {
      demoProgressRef.current = 1;
      paint();
      return;
    }
    if (reduceMotion) {
      demoProgressRef.current = 1;
      paint();
      const t = window.setTimeout(() => onDemoEnd?.(), 1500);
      return () => window.clearTimeout(t);
    }
    let raf = 0;
    let start = 0;
    const duration = 3200;
    const delay = 700;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.max(0, Math.min(1, (ts - start - delay) / duration));
      demoProgressRef.current = easeInOut(p);
      paint();
      if (p < 1) raf = requestAnimationFrame(step);
      else onDemoEnd?.();
    };
    demoProgressRef.current = 0;
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, mode]);

  const interactive = mode === 'trace' || mode === 'free';

  const toPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    window.clearTimeout(timerRef.current);
    drawingRef.current = true;
    drawnRef.current.push([toPoint(e)]);
    paint();
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const line = drawnRef.current[drawnRef.current.length - 1];
    const p = toPoint(e);
    const last = line[line.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.004) {
      line.push(p);
      paint();
    }
  };
  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    timerRef.current = window.setTimeout(() => {
      const drawn = drawnRef.current;
      drawnRef.current = [];
      onAttempt?.(drawn);
      // keep the drawing visible a moment for the feedback, then clear
      drawnRef.current = drawn;
      paint();
    }, PAUSE_MS);
  };

  return (
    <div className="slate-frame">
      <canvas
        ref={canvasRef}
        className={`slate ${interactive ? 'is-interactive' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label="Writing slate"
        role="img"
      />
    </div>
  );
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function drawFingertip(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 201, 60, 0.35)';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SUN;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, nx: number, ny: number, size: number) {
  const a = Math.atan2(ny - y, nx - x);
  const len = size * 0.1;
  // place the arrow just outside the stroke start, pointing along the path
  const ox = x + Math.cos(a) * size * 0.07 - Math.sin(a) * size * 0.075;
  const oy = y + Math.sin(a) * size * 0.07 + Math.cos(a) * size * 0.075;
  const ex = ox + Math.cos(a) * len;
  const ey = oy + Math.sin(a) * len;
  ctx.save();
  ctx.strokeStyle = SUN;
  ctx.fillStyle = SUN;
  ctx.lineWidth = size * 0.014;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  const h = size * 0.03;
  ctx.beginPath();
  ctx.moveTo(ex + Math.cos(a) * h, ey + Math.sin(a) * h);
  ctx.lineTo(ex + Math.cos(a + 2.3) * h, ey + Math.sin(a + 2.3) * h);
  ctx.lineTo(ex + Math.cos(a - 2.3) * h, ey + Math.sin(a - 2.3) * h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
