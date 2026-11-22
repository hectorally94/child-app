import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { InstallCard } from '../components/InstallCard';
import { Mascot } from '../components/Mascot';
import { PinPad } from '../components/PinPad';
import type { Lang } from '../engine/types';
import { t } from '../i18n';
import { checkPin } from '../storage/pin';

interface Props {
  lang: Lang;
  firstRun: boolean;
  /** Fingerprint of the parent code; when set, the code is asked instead of the multiplication. */
  pinHash?: string;
  onPass: () => void;
  onCancel?: () => void;
  /** Parent forgot the code and answered the multiplication: remove the code. */
  onForgotPin: () => void;
}

/** Parental gate (PRD §21): the parent's secret code, or a multiplication a young child cannot solve. */
export function ParentGate({ lang, firstRun, pinHash, onPass, onCancel, onForgotPin }: Props) {
  const [forgot, setForgot] = useState(false);
  const [wrong, setWrong] = useState(0);
  const usePin = !!pinHash && !forgot;

  const tryPin = async (pin: string) => {
    if (await checkPin(pin, pinHash)) onPass();
    else setWrong((n) => n + 1);
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-canvas px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10">
      <motion.div
        className="clay w-full max-w-md px-6 pt-4 pb-6"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <div className="flex justify-center"><Mascot size={76} /></div>
        <h1 className="m-0 text-center font-display text-2xl font-black text-ink">
          {firstRun ? t('welcomeParent', lang) : t('parentArea', lang)}
        </h1>

        {usePin ? (
          <div className="mt-4">
            <PinPad label={t('enterCode', lang)} onComplete={tryPin} shake={wrong} deleteLabel={t('deleteDigit', lang)} />
            <AnimatePresence>
              {wrong > 0 && (
                <motion.p key={wrong} role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="m-0 mt-3 text-center font-medium text-[#b91c1c]">
                  {t('wrongCode', lang)}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {onCancel && (
                <button type="button" onClick={onCancel} className="clay-btn is-white !min-h-12 text-base">
                  <Icon name="back" size={18} />{t('cancel', lang)}
                </button>
              )}
              <button type="button" onClick={() => setForgot(true)} className="clay-btn is-ghost !min-h-12 text-base">
                {t('forgotCode', lang)}
              </button>
            </div>
          </div>
        ) : (
          <MultiplicationGate
            lang={lang}
            help={forgot ? t('forgotHelp', lang) : undefined}
            onPass={() => {
              if (forgot) onForgotPin();
              onPass();
            }}
            onCancel={forgot ? () => setForgot(false) : onCancel}
          />
        )}
      </motion.div>
      <div className="w-full max-w-md"><InstallCard lang={lang} compact /></div>
    </div>
  );
}

function MultiplicationGate({ lang, help, onPass, onCancel }: { lang: Lang; help?: string; onPass: () => void; onCancel?: () => void }) {
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
    <motion.form
      key={shake}
      onSubmit={submit}
      animate={shake ? { x: [0, -12, 12, -8, 8, 0] } : undefined}
      transition={{ duration: 0.4 }}
    >
      {help && <p className="m-0 mt-3 rounded-[16px] bg-sun-soft p-3 text-center text-sm text-[#92400e]">{help}</p>}
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
  );
}
