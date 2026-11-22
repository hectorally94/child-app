import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { checkPronunciation } from '../engine/pronounce';
import { playSound, speakAsync, speakFeedback } from '../engine/speech';
import type { Lang } from '../engine/types';
import { micSupported, playRecording, recognitionSupported, recognize, recordVoice } from '../engine/voice';
import { t } from '../i18n';
import { Icon } from './Icon';

type Phase = 'idle' | 'listening' | 'feedback' | 'done';

export interface SpeakInfo {
  /** true when the words were checked with speech recognition (false = only "she spoke"). */
  checked: boolean;
  score: number;
  heard: string;
}

interface Props {
  lang: Lang;
  /** What the child has to say ("le chat", "Je veux aller aux toilettes"). */
  expected: string;
  /** Check the words (parent setting). When recognition is unavailable, falls back to "she spoke". */
  check: boolean;
  /** Share of important words needed: 1 for single words, lower for sentences. */
  minScore?: number;
  /** Words that are not required (e.g. the child's own name). */
  skip?: string[];
  /** Called when she said it right (or spoke, without check). */
  onDone: (info: SpeakInfo) => void;
  /** Called after each wrong attempt (to record it). */
  onMiss?: (info: SpeakInfo) => void;
}

/**
 * "Your turn to speak". With the check on: speech recognition must hear the expected words
 * ("miaou" is not "le chat") → "Bravo ! Tu as bien dit : le chat." or "Faux. J'ai entendu « miaou »…"
 * and Pipo repeats the word slowly. Without the check (or offline): rewards speaking and plays her voice back.
 */
export function SpeakButton({ lang, expected, check, minScore = 1, skip, onDone, onMiss }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [noMic, setNoMic] = useState(!micSupported());
  const fallback = useRef(false); // recognition failed once (offline…): use "she spoke" for the rest of this item
  const busy = useRef(false);

  const finish = (info: SpeakInfo) => {
    setPhase('done');
    busy.current = false;
    onDone(info);
  };

  const listenChecked = async (): Promise<boolean> => {
    // returns false when recognition is not usable → caller falls back
    const r = await recognize(lang === 'fr' ? 'fr' : 'en');
    if (r.status === 'unavailable') {
      fallback.current = true;
      return false;
    }
    if (r.status === 'nothing') {
      setPhase('idle');
      const text = t('notHeard', lang);
      setNote(text);
      void speakAsync(text, lang);
      busy.current = false;
      return true;
    }
    const res = checkPronunciation(expected, r.alternatives, { minScore, skip });
    const info: SpeakInfo = { checked: true, score: res.score, heard: res.heard };
    setPhase('feedback');
    if (res.ok) {
      const text = t('saidWell', lang, { text: expected });
      setNote(text);
      speakFeedback(text, lang, true);
      await new Promise((ok) => window.setTimeout(ok, 2200));
      finish(info);
    } else {
      onMiss?.(info);
      const text = res.heard ? t('heardWrong', lang, { heard: res.heard, text: expected }) : t('heardWrongShort', lang, { text: expected });
      setNote(text);
      speakFeedback(text, lang, false);
      await new Promise((ok) => window.setTimeout(ok, 900 + text.length * 70));
      // Pipo says it again, slowly, so she can copy the sounds
      await speakAsync(expected, lang, { rate: 0.6, pitch: 1.05 });
      setNote(t('tryAgainSay', lang, { text: expected }));
      setPhase('idle');
      busy.current = false;
    }
    return true;
  };

  const listenSpoke = async () => {
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
    setPhase('feedback');
    const praise = t('youSpoke', lang);
    setNote(praise);
    speakFeedback(praise, lang, true);
    await new Promise((ok) => window.setTimeout(ok, 1700));
    setNote(t('listenYourself', lang));
    await playRecording(r.url);
    finish({ checked: false, score: 1, heard: '' });
  };

  const listen = async () => {
    if (busy.current) return;
    busy.current = true;
    setNote(null);
    setPhase('listening');
    playSound('unlock');
    if (check && !fallback.current && recognitionSupported()) {
      const handled = await listenChecked();
      if (handled) return;
    }
    await listenSpoke();
  };

  const listening = phase === 'listening';
  return (
    <div className="flex flex-col items-center gap-2">
      {noMic ? (
        <button onClick={() => { playSound('success'); finish({ checked: false, score: 1, heard: '' }); }} className="clay-btn is-pink !min-h-16 !px-6 text-xl">
          <Icon name="check" size={26} />{t('iSaidIt', lang)}
        </button>
      ) : (
        <motion.button
          onClick={listen}
          disabled={phase !== 'idle'}
          aria-label={listening ? t('listening', lang) : t('tapMic', lang)}
          className="relative grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-gradient-to-b from-[#f472b6] to-pink text-white shadow-[0_7px_0_#be185d,0_16px_24px_-8px_rgb(236_72_153/0.6)] disabled:opacity-100"
          whileTap={{ scale: 0.92, y: 4 }}
          animate={phase === 'idle' ? { scale: [1, 1.07, 1] } : { scale: 1 }}
          transition={phase === 'idle' ? { duration: 1.5, repeat: Infinity } : { duration: 0.2 }}
        >
          {listening && [0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border-4 border-pink"
              // real level when recording; a gentle pulse while the recognizer listens
              animate={level > 0 ? { scale: 1 + level * (0.6 + i * 0.4), opacity: 0.25 + level * 0.6 } : { scale: [1, 1.5 + i * 0.3], opacity: [0.6, 0] }}
              transition={level > 0 ? { duration: 0.08 } : { duration: 1.1, repeat: Infinity, delay: i * 0.4 }}
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
          className={`m-0 min-h-6 max-w-[22rem] text-center font-extrabold ${
            note && /^(Faux|Wrong)/.test(note) ? 'rounded-[16px] bg-[#fee2e2] px-3 py-1.5 text-lg text-[#b91c1c]'
              : note && /^(Bravo)/.test(note) ? 'rounded-[16px] bg-mint-soft px-3 py-1.5 text-lg text-mint-deep'
                : 'text-base text-ink-soft'}`}
          aria-live="polite"
        >
          {note ?? (listening ? t('listening', lang) : noMic ? '' : t('tapMic', lang))}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
