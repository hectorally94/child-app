import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

/** Soft colored blobs drifting slowly behind the child screens. */
export function Blobs() {
  const reduce = useReducedMotion();
  const blobs = [
    { c: '#dbe7ff', x: '-12%', y: '-8%', s: 340, d: 18 },
    { c: '#fde2f0', x: '68%', y: '6%', s: 260, d: 22 },
    { c: '#fff3c4', x: '-6%', y: '70%', s: 300, d: 20 },
    { c: '#d1fae5', x: '72%', y: '74%', s: 240, d: 24 },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-2xl"
          style={{ left: b.x, top: b.y, width: b.s, height: b.s, background: b.c, opacity: 0.9 }}
          animate={reduce ? undefined : { x: [0, 20, -10, 0], y: [0, -16, 12, 0] }}
          transition={{ duration: b.d, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

const COLORS = ['#2563eb', '#fbbf24', '#ec4899', '#10b981', '#7c3aed', '#f97362'];

/** One burst of confetti from the center: the celebration moment. */
export function Confetti({ pieces = 46 }: { pieces?: number }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const angle = (i / pieces) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 140 + Math.random() * 220;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 80,
          r: Math.random() * 540 - 270,
          c: COLORS[i % COLORS.length],
          w: 8 + Math.random() * 8,
          round: i % 3 === 0,
          delay: Math.random() * 0.15,
        };
      }),
    [pieces],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible" aria-hidden="true">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{ width: b.w, height: b.round ? b.w : b.w * 0.5, background: b.c, borderRadius: b.round ? 999 : 3 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 260], opacity: [1, 1, 0], rotate: b.r, scale: 1 }}
          transition={{ duration: 1.9, delay: b.delay, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
