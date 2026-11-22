import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { playSound, speakAsync, speakFeedback } from '../engine/speech';
import type { Lang } from '../engine/types';
import { micSupported, playRecording, recordVoice } from '../engine/voice';
import { t } from '../i18n';
import { Icon } from './Icon';

type Phase = 'idle' | 'listening' | 'playback' | 'done';

/**
 * "Your turn to speak": big microphone. Records the child, notices that she spoke (not graded),
 * praises her and plays her own voice back. If no microphone is available, a "Je l'ai dit !" button is shown.
 * onDone(spoke): spoke = true when a voice was heard (or the child confirmed without a mic).
 */
export function SpeakButton({ lang, onDone }: { lang: Lang; onDone: (spoke: boolean, seconds: number) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [noMic, setNoMic] = useState(!micSupported());
  const busy = useRef(false);

  const listen = async () => {
    if (busy.current) return;
    busy.current = true;
    setNote(null);
    setPhase('listening');
    playSound('unlock');
    const r = await recordVoice({ onLevel: setLevel });
    setLevel(0);
    if (r.status === 'unavailable') {
      setNoMic(true);
      setPhase('idle');
      setNote(t('noMic', lang));
      busy.current = false;
      return;
    }
    if (r.status === 'silent') {
      setPhase('idle');
      const text = t('notHeard', lang);
      setNote(text);
      void speakAsync(text, lang);
      busy.current = false;
      return;
    }
    // She spoke: praise, then let her hear her own voice
    setPhase('playback');
    const praise = t('youSpoke', lang);
    setNote(praise);
    speakFeedback(praise, lang, true);
    await new Promise((res) => window.setTimeout(res, 1700));
    setNote(t('listenYourself', lang));
    await playRecording(r.url);
    setPhase('done');
    busy.current = false;
    onDone(true, r.seconds);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {noMic ? (
        <button onClick={() => { playSound('success'); onDone(true, 0); }} className="clay-btn is-pink !min-h-16 !px-6 text-xl">
          <Icon name="check" size={26} />{t('iSaidIt', lang)}
        </button>
      ) : (
        <motion.button
          onClick={listen}
          disabled={phase !== 'idle'}
          aria-label={phase === 'listening' ? t('listening', lang) : t('tapMic', lang)}
          className="relative grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-gradient-to-b from-[#f472b6] to-pink text-white shadow-[0_7px_0_#be185d,0_16px_24px_-8px_rgb(236_72_153/0.6)] disabled:opacity-100"
          whileTap={{ scale: 0.92, y: 4 }}
          animate={phase === 'idle' ? { scale: [1, 1.07, 1] } : { scale: 1 }}
          transition={phase === 'idle' ? { duration: 1.5, repeat: Infinity } : { duration: 0.2 }}
        >
          {phase === 'listening' && [0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border-4 border-pink"
              animate={{ scale: 1 + level * (0.6 + i * 0.4), opacity: 0.25 + level * 0.6 }}
              transition={{ duration: 0.08 }}
            />
          ))}
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
          </svg>
        </motion.button>
      )}
      <AnimatePresence mode="wait">
        <motion.p
          key={note ?? phase}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="m-0 min-h-6 max-w-[22rem] text-center text-base font-extrabold text-ink-soft"
          aria-live="polite"
        >
          {note ?? (phase === 'listening' ? t('listening', lang) : noMic ? '' : t('tapMic', lang))}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
