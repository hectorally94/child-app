import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';
import { sampleStroke } from '../engine/geometry';
import type { Point, StrokeDef } from '../engine/types';

/**
 * The writing board: shows the guide, plays the demonstration, and captures the child's strokes.
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
  /** Show the middle writing line (lowercase letters). */
  midline?: boolean;
}

const GUIDE = '#c4b5fd'; // soft violet dots
const DEMO = '#2563eb'; // learning blue crayon
const ARROW = '#f59e0b';
const START = '#10b981';
const CHILD = '#ec4899'; // the child's pink crayon
const LINES = '#e7e1f5';
const PAUSE_MS = 1100;

export function Slate({ strokes, mode, guide, resetKey, onAttempt, onDemoEnd, midline = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawnRef = useRef<Point[][]>([]);
  const drawingRef = useRef(false);
  const timerRef = useRef<number>();
  const demoProgressRef = useRef(mode === 'demo' ? 0 : 1);
  const reduceMotion = useReducedMotion() ?? false;

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

    // School writing lines (top line and base line)
    ctx.save();
    ctx.strokeStyle = LINES;
    ctx.lineWidth = Math.max(2, size * 0.006);
    ctx.setLineDash([size * 0.02, size * 0.02]);
    for (const y of midline ? [0.1, 0.46, 0.9] : [0.1, 0.9]) {
      ctx.beginPath();
      ctx.moveTo(size * 0.06, size * y);
      ctx.lineTo(size * 0.94, size * y);
      ctx.stroke();
    }
    ctx.restore();

    // Guide: a solid shape on the introduction, dotted while practising
    if (guide !== 'none' || mode === 'show' || mode === 'demo') {
      ctx.save();
      ctx.strokeStyle = mode === 'show' ? DEMO : GUIDE;
      ctx.globalAlpha = mode === 'show' ? 1 : guide === 'faint' ? 0.35 : 1;
      ctx.lineWidth = size * (mode === 'show' ? 0.075 : 0.05);
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
      ctx.strokeStyle = DEMO;
      ctx.lineWidth = size * 0.055;
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

    // Direction arrow next to the start (the start dot itself is an animated overlay)
    if (mode !== 'show' && (guide !== 'none' || mode === 'demo')) {
      guides.forEach((g) => {
        const [x, y] = px(g[0]);
        const [nx, ny] = px(g[Math.min(6, g.length - 1)]);
        drawArrow(ctx, x, y, nx, ny, size);
      });
    }

    // Child's crayon
    ctx.save();
    ctx.strokeStyle = CHILD;
    ctx.lineWidth = size * 0.05;
    for (const line of drawnRef.current) {
      ctx.beginPath();
      line.forEach((p, i) => (i ? ctx.lineTo(...px(p)) : ctx.moveTo(...px(p))));
      if (line.length === 1) ctx.lineTo(px(line[0])[0] + 0.1, px(line[0])[1]);
      ctx.stroke();
    }
    ctx.restore();
  }, [strokes, mode, guide, midline]);

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
  const showStart = mode !== 'show' && (guide !== 'none' || mode === 'demo');
  // Where to put each numbered start dot. If a stroke starts where an earlier one starts (like the two
  // legs of A), its dot moves a little way along its own line so both numbers stay visible.
  const starts = strokes.map((st, i) => {
    const pts = sampleStroke(st);
    const clash = strokes.slice(0, i).some((prev) => {
      const q = sampleStroke(prev)[0];
      return Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]) < 0.07;
    });
    return clash ? pts[Math.round(pts.length * 0.16)] : pts[0];
  });
  const numbered = strokes.length > 1;

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
    <div className="clay relative mx-auto aspect-square w-full overflow-hidden !rounded-[clamp(22px,7%,36px)] bg-[#fffdf8]">
      {showStart &&
        starts.map((start, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center"
            style={{ left: `${start[0] * 100}%`, top: `${start[1] * 100}%`, width: numbered ? '9%' : '11%', height: numbered ? '9%' : '11%' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18, delay: i * 0.12 }}
            aria-hidden="true"
          >
            {!reduceMotion && i === 0 && (
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ background: START }}
                animate={{ scale: [1, 1.9], opacity: [0.45, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <span
              className="relative grid h-[78%] w-[78%] place-items-center rounded-full border-[3px] border-white font-display text-[clamp(0.7rem,3vw,1.1rem)] leading-none font-black text-white shadow-[0_3px_8px_rgb(16_185_129/0.5)]"
              style={{ background: START, opacity: i === 0 ? 1 : 0.85 }}
            >
              {numbered ? i + 1 : ''}
            </span>
          </motion.span>
        ))}
      <canvas
        ref={canvasRef}
        className={`relative block h-full w-full touch-none ${interactive ? 'cursor-crosshair' : ''}`}
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
  ctx.fillStyle = 'rgba(37, 99, 235, 0.18)';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = DEMO;
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
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
  ctx.strokeStyle = ARROW;
  ctx.fillStyle = ARROW;
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
