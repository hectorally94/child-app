import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PIN_LENGTH } from '../storage/pin';
import { Icon } from './Icon';

/**
 * Big number keypad with dots, for the parent code. Calls onComplete when all digits are typed.
 * `shake` changes → the dots shake and the code is cleared (wrong code).
 */
export function PinPad({ label, onComplete, shake = 0, deleteLabel }: {
  label: string; onComplete: (pin: string) => void; shake?: number; deleteLabel: string;
}) {
  const [pin, setPin] = useState('');
  useEffect(() => setPin(''), [shake]);

  const press = (d: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) window.setTimeout(() => onComplete(next), 120);
  };

  // Physical keyboard too (computers)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="m-0 text-center text-lg font-medium text-ink-soft" id="pin-label">{label}</p>
      <motion.div
        key={shake}
        className="flex gap-4"
        role="status"
        aria-labelledby="pin-label"
        aria-label={`${pin.length} / ${PIN_LENGTH}`}
        animate={shake ? { x: [0, -12, 12, -8, 8, 0] } : undefined}
        transition={{ duration: 0.4 }}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <motion.span
            key={i}
            className={`block h-4 w-4 rounded-full border-2 ${i < pin.length ? 'border-blue bg-blue' : 'border-[#c9c1df] bg-transparent'}`}
            animate={i === pin.length - 1 ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </motion.div>
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
          k === '' ? <span key={i} /> : (
            <button
              key={i}
              type="button"
              onClick={() => (k === 'del' ? setPin((p) => p.slice(0, -1)) : press(k))}
              aria-label={k === 'del' ? deleteLabel : k}
              className={`clay-btn ${k === 'del' ? 'is-ghost' : 'is-white'} !h-16 !w-16 !rounded-full !p-0 font-display !text-2xl text-ink`}
            >
              {k === 'del' ? <Icon name="back" size={26} /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
