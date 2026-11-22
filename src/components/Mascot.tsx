import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Pipo, the guide: a round little bird. Pure SVG, animated with Framer Motion.
 * Moods tell a child who can't read yet what is happening.
 */
export type Mood = 'idle' | 'talk' | 'happy' | 'encourage';

const body: Variants = {
  idle: { y: [0, -6, 0], rotate: 0, transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  talk: { y: [0, -4, 0], rotate: [0, -2, 2, 0], transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } },
  happy: { y: [0, -34, 0, -16, 0], rotate: [0, -8, 8, 0], transition: { duration: 0.9, ease: 'easeOut' } },
  encourage: { y: 0, rotate: [0, -10, -6], transition: { duration: 0.6, ease: 'easeOut' } },
};

export function Mascot({ mood = 'idle', size = 120 }: { mood?: Mood; size?: number }) {
  const reduce = useReducedMotion();
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reduce]);

  const happy = mood === 'happy';
  return (
    <motion.svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
      variants={reduce ? undefined : body}
      animate={mood}
      style={{ overflow: 'visible' }}
    >
      {/* shadow */}
      <ellipse cx="60" cy="113" rx="30" ry="5" fill="#2b2740" opacity="0.12" />
      {/* feet */}
      <path d="M48 100 l-4 9 M48 100 l2 9 M72 100 l-2 9 M72 100 l4 9" stroke="#f97362" strokeWidth="4" strokeLinecap="round" />
      {/* body */}
      <defs>
        <radialGradient id="pipo-body" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff1a8" />
          <stop offset="55%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <radialGradient id="pipo-belly" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fffdf2" />
          <stop offset="100%" stopColor="#ffeeb3" />
        </radialGradient>
      </defs>
      {/* tuft */}
      <motion.path
        d="M58 18 C52 6 60 2 62 10 C64 2 72 6 64 18 Z"
        fill="#ec4899"
        animate={reduce ? undefined : { rotate: happy ? [0, -20, 20, 0] : [0, -6, 0] }}
        transition={{ duration: happy ? 0.6 : 2.4, repeat: happy ? 0 : Infinity }}
        style={{ originX: '60px', originY: '18px' }}
      />
      <ellipse cx="60" cy="62" rx="42" ry="44" fill="url(#pipo-body)" />
      <ellipse cx="60" cy="76" rx="25" ry="22" fill="url(#pipo-belly)" />
      {/* wings */}
      <motion.path
        d="M20 62 C6 66 8 86 24 84 C30 80 30 68 20 62 Z"
        fill="#2563eb"
        animate={reduce ? undefined : { rotate: happy ? [0, 40, 0, 40, 0] : mood === 'talk' ? [0, 10, 0] : 0 }}
        transition={{ duration: happy ? 0.8 : 0.9, repeat: mood === 'talk' ? Infinity : 0 }}
        style={{ originX: '26px', originY: '66px' }}
      />
      <motion.path
        d="M100 62 C114 66 112 86 96 84 C90 80 90 68 100 62 Z"
        fill="#2563eb"
        animate={reduce ? undefined : { rotate: happy ? [0, -40, 0, -40, 0] : mood === 'encourage' ? [0, -35, -25] : 0 }}
        transition={{ duration: 0.8 }}
        style={{ originX: '94px', originY: '66px' }}
      />
      {/* eyes */}
      {happy ? (
        <>
          <path d="M38 50 q7 -9 14 0" stroke="#2b2740" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <path d="M68 50 q7 -9 14 0" stroke="#2b2740" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="45" cy="50" rx="8" ry={blink ? 1 : 9} fill="#2b2740" />
          <ellipse cx="75" cy="50" rx="8" ry={blink ? 1 : 9} fill="#2b2740" />
          {!blink && <circle cx="48" cy="46" r="3" fill="#fff" />}
          {!blink && <circle cx="78" cy="46" r="3" fill="#fff" />}
        </>
      )}
      {/* cheeks */}
      <ellipse cx="33" cy="64" rx="7" ry="4.5" fill="#ec4899" opacity="0.35" />
      <ellipse cx="87" cy="64" rx="7" ry="4.5" fill="#ec4899" opacity="0.35" />
      {/* beak: opens while talking / happy */}
      <path d="M52 60 Q60 55 68 60 Q60 66 52 60 Z" fill="#f97362" />
      <motion.path
        d="M53 62 Q60 66 67 62 Q60 72 53 62 Z"
        fill="#e2553f"
        animate={reduce ? undefined : { scaleY: mood === 'talk' ? [0.3, 1, 0.3] : happy ? 1 : 0.3 }}
        transition={{ duration: 0.35, repeat: mood === 'talk' ? Infinity : 0 }}
        style={{ originX: '60px', originY: '62px' }}
      />
    </motion.svg>
  );
}
