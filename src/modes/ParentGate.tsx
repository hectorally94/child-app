import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import type { Lang } from '../engine/types';
import { t } from '../i18n';

/** A simple parental gate: a multiplication a young child is unlikely to solve (PRD §21). */
export function ParentGate({ lang, firstRun, onPass, onCancel }: { lang: Lang; firstRun: boolean; onPass: () => void; onCancel?: () => void }) {
  const [a, b] = useMemo(() => [3 + Math.floor(Math.random() * 7), 3 + Math.floor(Math.random() * 7)], []);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(value) === a * b) onPass();
    else {
      setError(true);
      setValue('');
      setShake((s) => s + 1);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-10">
      <motion.form
        key={shake}
        onSubmit={submit}
        className="clay w-full max-w-md px-6 pt-4 pb-6"
        initial={shake ? { x: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
        animate={shake ? { x: [0, -12, 12, -8, 8, 0] } : { opacity: 1, y: 0, scale: 1 }}
        transition={shake ? { duration: 0.4 } : { type: 'spring', stiffness: 260, damping: 22 }}
      >
        <div className="flex justify-center"><Mascot size={84} /></div>
        <h1 className="m-0 text-center font-display text-2xl font-black text-ink">
          {firstRun ? t('welcomeParent', lang) : t('parentArea', lang)}
        </h1>
        <label htmlFor="gate-answer" className="mt-5 block text-center text-lg font-medium text-ink-soft">
          {t('gateQuestion', lang, { a, b })}
        </label>
        <input
          id="gate-answer"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={value}
          aria-invalid={error}
          aria-describedby={error ? 'gate-error' : undefined}
          onChange={(e) => { setValue(e.target.value.replace(/\D/g, '').slice(0, 3)); setError(false); }}
          className="clay-input mt-3 text-center font-display !text-3xl font-black tracking-widest"
        />
        <AnimatePresence>
          {error && (
            <motion.p id="gate-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="m-0 mt-2 text-center font-medium text-[#b91c1c]">
              {t('wrongAnswer', lang)}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="mt-5 flex gap-3">
          {onCancel && (
            <button type="button" onClick={onCancel} className="clay-btn is-white flex-1">
              <Icon name="back" size={20} />{t('cancel', lang)}
            </button>
          )}
          <button type="submit" className="clay-btn flex-1" disabled={!value}>
            {t('enter', lang)}<Icon name="next" size={20} />
          </button>
        </div>
      </motion.form>
    </div>
  );
}
