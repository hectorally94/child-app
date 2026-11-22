import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Confetti } from '../components/Decor';
import { Icon } from '../components/Icon';
import { Mascot, type Mood } from '../components/Mascot';
import { SpeakButton, type SpeakInfo } from '../components/SpeakButton';
import { isSoundWord, syllablesFor, type ShortWord } from '../content/short';
import { pictureUrl } from '../content/speak';
import { SLOTS, type Slot } from '../engine/routine';
import { playSound, speakAsync, stopSpeaking } from '../engine/speech';
import { t, tr, type UIKey } from '../i18n';
import type { AppData, Child } from '../storage/store';
import { simpleAttempt, useSession } from './WordsPlayer';

export const SLOT_LABEL: Record<Slot, UIKey> = { morning: 'slotMorning', afternoon: 'slotAfternoon', evening: 'slotEvening' };

const REPS = 3; // every word is said three times
const BLOCKS = ['bg-blue', 'bg-pink', 'bg-mint', 'bg-violet'];
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const spring = { type: 'spring', stiffness: 260, damping: 22 } as const;

interface Props {
  title: string;
  words: ShortWord[];
  /** Words of the session that are review (they do not block the pack from being mastered). */
  review: Set<string>;
  /** Session key stored with the progress, e.g. "short:famille". */
  lessonKey: string;
  slot?: Slot;
  /** Sessions already finished today, before this one. */
  doneBefore: Set<Slot>;
  child: Child;
  update: (fn: (d: AppData) => AppData) => void;
  compact: boolean;
  onHome: () => void;
}

/**
 * One practice session of short words. For each word: Pipo says the syllables slowly (blocks light up), then the
 * whole word slowly, then normally; the child repeats. Three repetitions per word: after the full model, after a quick
 * model, and ALONE (no model). After three misses a "later" button lets the parent move on.
 */
export function ShortPlayer({ title, words, review, lessonKey, slot, doneBefore, child, update, compact, onHome }: Props) {
  const lang = child.childLang;
  const session = useSession(update, child.id, lessonKey, slot);
  const [wi, setWi] = useState(0);
  const [rep, setRep] = useState(0);
  const [phase, setPhase] = useState<'work' | 'summary'>('work');
  const [lit, setLit] = useState(-1); // -1 nothing, -2 the whole word, >=0 one syllable
  const [canSpeak, setCanSpeak] = useState(false);
  const [misses, setMisses] = useState<Record<string, number>>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  const [shake, setShake] = useState(0);
  const [mood, setMood] = useState<Mood>('idle');
  const [bubble, setBubble] = useState('');
  const alive = useRef(true);
  const token = useRef(0);
  const finished = useRef(false);
  useEffect(() => () => { alive.current = false; stopSpeaking(); }, []);

  const word = words[wi];
  const text = word ? tr(word.word, lang) : '';
  const syl = word ? syllablesFor(word, lang) : [];

  // Model: syllables slowly → word slowly → word normally (first time); word normally (second); nothing (third, alone)
  useEffect(() => {
    if (phase !== 'work' || !word) return;
    const mine = ++token.current;
    const live = () => alive.current && token.current === mine;
    setCanSpeak(false);
    setLit(-1);
    (async () => {
      await sleep(rep === 0 ? 500 : 250);
      if (!live()) return;
      if (rep === 0) {
        setMood('talk');
        setBubble(t('listenCarefully', lang));
        if (syl.length > 1) {
          for (let i = 0; i < syl.length; i++) {
            if (!live()) return;
            setLit(i);
            await speakAsync(syl[i], lang, { rate: 0.5 });
            await sleep(120);
          }
        }
        if (!live()) return;
        setLit(-2);
        await speakAsync(text, lang, { rate: 0.55 });
        await sleep(250);
        if (!live()) return;
        await speakAsync(text, lang);
      } else if (rep === 1) {
        setMood('talk');
        setBubble(t('listenCarefully', lang));
        setLit(-2);
        await speakAsync(text, lang);
      } else {
        setMood('idle');
        setBubble(t('sayAlone', lang));
        await speakAsync(t('sayAlone', lang), lang);
      }
      if (!live()) return;
      setLit(-1);
      setMood('idle');
      setBubble(t('yourTurnShort', lang));
      setCanSpeak(true);
    })();
    return () => { token.current++; stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wi, rep, phase]);

  const finishSession = (skippedNow: string[]) => {
    if (finished.current) return;
    finished.current = true;
    const blocking = skippedNow.filter((id) => !review.has(id));
    session.finish(blocking.length === 0, skippedNow);
    setPhase('summary');
    setMood('happy');
    window.setTimeout(() => playSound('unlock'), 400);
    const left = SLOTS.filter((s) => !doneBefore.has(s) && s !== slot);
    const allThree = slot ? left.length === 0 : false;
    const line = allThree ? t('threeSessions', lang) : t('sessionComplete', lang);
    setBubble(line);
    void speakAsync(line, lang);
  };

  const nextWord = (skippedNow: string[]) => {
    window.setTimeout(() => {
      if (!alive.current) return;
      if (wi + 1 < words.length) {
        setWi(wi + 1);
        setRep(0);
      } else finishSession(skippedNow);
    }, 800);
  };

  const onSuccess = (info: SpeakInfo) => {
    session.add({ ...simpleAttempt('speak', true), coverage: info.score, item: word.id });
    setMood('happy');
    if (rep + 1 < REPS) setRep(rep + 1);
    else {
      playSound('success');
      nextWord(skipped);
    }
  };

  const onMiss = (info: SpeakInfo) => {
    session.add({ ...simpleAttempt('speak', false), coverage: info.score, item: word.id });
    setMisses((m) => ({ ...m, [word.id]: (m[word.id] ?? 0) + 1 }));
    setMood('encourage');
    setShake((n) => n + 1);
  };

  const skip = () => {
    stopSpeaking();
    const next = [...skipped, word.id];
    setSkipped(next);
    setCanSpeak(false);
    setBubble(t('laterSkip', lang));
    void speakAsync(t('laterSkip', lang), lang);
    nextWord(next);
  };

  const steps = words.length * REPS;
  const stepNow = phase === 'summary' ? steps : wi * REPS + rep;
  const doneToday = slot ? new Set([...doneBefore, slot]) : doneBefore;
  const nextSlot = SLOTS.find((s) => !doneToday.has(s)) ?? null;

  return (
    <motion.main
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="relative z-10 mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col items-center gap-2 overflow-y-auto px-3 pt-2 pb-3 sm:gap-3 sm:px-4 sm:pt-3"
    >
      {/* top bar */}
      <div className="flex w-full items-center gap-3 pr-12">
        <button onClick={onHome} aria-label={t('home', lang)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/80 text-ink-soft shadow-sm active:scale-90">
          <Icon name="home" size={22} />
        </button>
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-white/70 shadow-[inset_1px_2px_4px_rgb(43_39_64/0.1)]"
          role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={steps} aria-valuenow={stepNow}>
          <motion.span className="block h-full rounded-full bg-gradient-to-r from-sun to-[#f97316]" animate={{ width: `${(stepNow / steps) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
      </div>

      {/* Pipo + bubble */}
      <div className="flex w-full items-end gap-1">
        <div className="-mb-1 shrink-0"><Mascot mood={mood} size={compact ? 56 : 78} /></div>
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.p key={bubble} initial={{ opacity: 0, y: 8, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              className="clay m-0 !rounded-[24px] px-4 py-2 text-center text-[clamp(1rem,4.6vw,1.5rem)] leading-tight font-extrabold" aria-live="polite">
              {bubble || '…'}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'work' && word && (
          <motion.div key={`w-${wi}`} className="flex w-full flex-col items-center gap-2 pt-1"
            initial={{ opacity: 0, x: 60, rotate: 3 }} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={{ opacity: 0, x: -60, rotate: -3 }} transition={spring}>
            {review.has(word.id) && (
              <span className="rounded-full bg-violet-soft px-3 py-0.5 text-xs font-extrabold text-violet">{t('reviewTag', lang)}</span>
            )}
            <button onClick={() => void speakAsync(text, lang, { rate: 0.7 })} aria-label={text}
              className="clay grid aspect-square w-[min(44vw,22dvh,13rem)] place-items-center !rounded-[36px] active:scale-95">
              <motion.img src={pictureUrl(word.image)} alt="" className="h-[70%] w-[70%]" draggable={false}
                animate={{ y: [0, -6, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />
            </button>

            {/* syllable blocks: they light up one by one while Pipo says the word slowly */}
            <motion.div key={`s-${shake}`} className="flex flex-wrap items-center justify-center gap-2"
              animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : undefined} transition={{ duration: 0.4 }} aria-label={text}>
              {syl.map((s, i) => {
                const on = lit === -2 || lit === i;
                const dim = lit >= 0 && lit !== i;
                return (
                  <motion.span key={`${s}-${i}`}
                    animate={{ scale: on ? 1.14 : 1, opacity: dim ? 0.5 : 1, y: on ? -4 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className={`rounded-[18px] px-4 py-1.5 font-display text-[clamp(1.6rem,8vw,2.4rem)] leading-tight font-black text-white shadow-[inset_0_-4px_0_rgb(0_0_0/0.15),0_6px_12px_-6px_rgb(43_39_64/0.4)] ${BLOCKS[i % BLOCKS.length]}`}>
                    {s}
                  </motion.span>
                );
              })}
            </motion.div>

            {/* three repetitions */}
            <div className="flex items-center gap-2" role="img" aria-label={t('repeatTimes', lang, { n: rep })}>
              {Array.from({ length: REPS }, (_, i) => (
                <motion.span key={i} animate={{ scale: i < rep ? [1, 1.4, 1] : 1 }} className={i < rep ? 'text-sun' : 'text-[#d6cbf2]'}>
                  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6L12 2Z" /></svg>
                </motion.span>
              ))}
            </div>

            <div className="flex min-h-[8.5rem] flex-col items-center justify-start gap-1">
              {canSpeak && (
                <SpeakButton
                  key={`${wi}-${rep}`}
                  lang={lang}
                  expected={text}
                  accept={word.accept}
                  strict
                  quick
                  check={child.checkSpeech !== false && !isSoundWord(word.id)}
                  onDone={onSuccess}
                  onMiss={onMiss}
                />
              )}
              {(misses[word.id] ?? 0) >= 3 && (
                <button onClick={skip} className="clay-btn is-ghost !min-h-10 text-sm text-ink-soft">
                  {t('skipWord', lang)}<Icon name="next" size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {phase === 'summary' && (
          <motion.div key="summary" className="relative flex w-full flex-col items-center gap-3 pt-2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Confetti pieces={36} />
            <h1 className="m-0 text-center text-[clamp(1.4rem,6vw,2.1rem)] leading-tight font-black text-pink">
              {slot ? t('sessionTitle', lang, { slot: t(SLOT_LABEL[slot], lang).toLowerCase() }) : title}
            </h1>
            <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
              {words.map((w, i) => {
                const left = skipped.includes(w.id);
                return (
                  <motion.li key={w.id} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.1 + i * 0.07 }}
                    className={`clay flex w-[4.6rem] flex-col items-center gap-0.5 !rounded-[20px] p-2 ${left ? 'opacity-60' : ''}`}>
                    <img src={pictureUrl(w.image)} alt="" className="h-9 w-9" />
                    <span className="text-xs leading-tight font-black">{tr(w.word, lang)}</span>
                    <span className={left ? 'text-[#b9b0d3]' : 'text-sun'} aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6L12 2Z" /></svg>
                    </span>
                  </motion.li>
                );
              })}
            </ul>
            {slot && (
              <div className="flex items-center gap-2" aria-label={t('sessionsToday', lang)}>
                {SLOTS.map((s) => (
                  <span key={s} className={`grid h-9 w-9 place-items-center rounded-full ${doneToday.has(s) ? 'bg-mint text-white' : 'bg-white/80 text-[#c9c1df]'}`} title={t(SLOT_LABEL[s], lang)}>
                    <Icon name="check" size={18} />
                  </span>
                ))}
              </div>
            )}
            {slot && nextSlot && <p className="m-0 text-center font-bold text-ink-soft">{t('nextSession', lang, { slot: t(SLOT_LABEL[nextSlot], lang).toLowerCase() })}</p>}
            <button onClick={onHome} className="clay-btn is-sun !mt-1 !px-8 text-lg"><Icon name="home" size={22} />{t('finish', lang)}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
