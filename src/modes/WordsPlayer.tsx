import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Confetti } from '../components/Decor';
import { Icon } from '../components/Icon';
import { Mascot, type Mood } from '../components/Mascot';
import { SpeakButton, type SpeakInfo } from '../components/SpeakButton';
import { pictureUrl, wordsKey, type Word, type WordSet } from '../content/speak';
import { playSound, speakAsync, speakFeedback, stopSpeaking } from '../engine/speech';
import { t, tr } from '../i18n';
import { newId, type AppData, type AttemptRecord, type Child } from '../storage/store';

/** A non-writing attempt (quiz answer or speaking) in the shared attempt format. */
export function simpleAttempt(activity: 'quiz' | 'speak', ok: boolean): AttemptRecord {
  return {
    activity, outcome: ok ? 'success' : 'retry', coverage: ok ? 1 : 0, offPath: 0, startOk: true,
    directionOk: null, pointCount: 0, hintShown: false, at: Date.now(),
  };
}

/** Session record helpers shared by the words player and the reels. */
export function useSession(update: (fn: (d: AppData) => AppData) => void, childId: string, key: string) {
  const id = useRef(newId());
  const created = useRef(false);
  useEffect(() => {
    if (created.current) return;
    created.current = true;
    update((d) => ({ ...d, sessions: [...d.sessions, { id: id.current, childId, lessonId: key, startedAt: Date.now(), endedAt: null, completed: false, attempts: [] }] }));
  }, [update, childId, key]);
  return {
    add: (a: AttemptRecord) =>
      update((d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === id.current ? { ...s, endedAt: Date.now(), attempts: [...s.attempts, a] } : s)) })),
    finish: () =>
      update((d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === id.current ? { ...s, endedAt: Date.now(), completed: true, mastered: true } : s)) })),
  };
}

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

interface Props {
  set: WordSet;
  child: Child;
  update: (fn: (d: AppData) => AppData) => void;
  compact: boolean;
  next: WordSet | null;
  onHome: () => void;
  onNext: (s: WordSet) => void;
}

export function WordsPlayer({ set, child, update, compact, next, onHome, onNext }: Props) {
  const lang = child.childLang;
  const session = useSession(update, child.id, wordsKey(set.id));
  const [phase, setPhase] = useState<'learn' | 'quiz' | 'done'>('learn');
  const [i, setI] = useState(0);
  const [mood, setMood] = useState<Mood>('idle');
  const [bubble, setBubble] = useState('');
  const [round, setRound] = useState(0);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; stopSpeaking(); }, []);

  const talk = async (text: string, after: Mood = 'idle') => {
    setBubble(text);
    setMood('talk');
    await speakAsync(text, lang);
    if (alive.current) setMood(after);
  };

  /* ---------------- learn: picture, word, sentence, repeat ---------------- */
  const word = set.words[i];
  const [canSpeak, setCanSpeak] = useState(false);
  useEffect(() => {
    if (phase !== 'learn') return;
    setCanSpeak(false);
    (async () => {
      await new Promise((r) => window.setTimeout(r, 500));
      if (!alive.current) return;
      await talk(tr(word.word, lang));
      if (!alive.current) return;
      await talk(tr(word.sentence, lang));
      if (!alive.current) return;
      await talk(t('repeatAfterMe', lang, { text: tr(word.word, lang) }));
      if (alive.current) setCanSpeak(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i]);

  const afterSpeak = (info: SpeakInfo) => {
    session.add({ ...simpleAttempt('speak', true), coverage: info.score });
    setMood('happy');
    window.setTimeout(() => {
      if (!alive.current) return;
      if (i + 1 < set.words.length) setI(i + 1);
      else {
        setPhase('quiz');
        setI(0);
      }
    }, 900);
  };

  /* ---------------- quiz: "Où est … ?" ---------------- */
  const order = useMemo(() => shuffle(set.words), [set, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [mistakes, setMistakes] = useState(0);
  const [wrongId, setWrongId] = useState<{ id: string; n: number } | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const target = order[i];
  const choices = useMemo(() => {
    if (phase !== 'quiz' || !target) return [];
    const others = shuffle(set.words.filter((w) => w.id !== target.id)).slice(0, 2);
    return shuffle([target, ...others]);
  }, [phase, target, set]);

  useEffect(() => {
    if (phase !== 'quiz' || !target) return;
    setRightId(null);
    setWrongId(null);
    (async () => {
      if (i === 0 && round === 0) await talk(t('quizStart', lang));
      if (alive.current) void talk(t('whereIs', lang, { word: tr(target.word, lang) }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i, round]);

  const answer = (w: Word) => {
    if (rightId) return;
    if (w.id === target.id) {
      session.add(simpleAttempt('quiz', true));
      setRightId(w.id);
      setMood('happy');
      const text = tr({ fr: 'Bravo ! ', en: 'Bravo! ' }, lang) + tr(target.word, lang) + '.';
      setBubble(text);
      speakFeedback(text, lang, true);
      window.setTimeout(() => {
        if (!alive.current) return;
        if (i + 1 < order.length) setI(i + 1);
        else if (mistakes === 0) {
          session.finish();
          setPhase('done');
        } else {
          // Not a perfect round: play the game again
          setMistakes(0);
          setBubble(t('quizAgain', lang));
          void speakAsync(t('quizAgain', lang), lang).then(() => {
            if (!alive.current) return;
            setI(0);
            setRound((r) => r + 1);
          });
        }
      }, 1600);
    } else {
      session.add(simpleAttempt('quiz', false));
      setMistakes((m) => m + 1);
      setWrongId((x) => ({ id: w.id, n: (x?.n ?? 0) + 1 }));
      setMood('encourage');
      const text = t('thatIs', lang, { word: tr(w.word, lang) });
      setBubble(text);
      speakFeedback(text, lang, false);
      window.setTimeout(() => alive.current && void talk(t('whereIs', lang, { word: tr(target.word, lang) })), 2600);
    }
  };

  /* ---------------- done ---------------- */
  useEffect(() => {
    if (phase !== 'done') return;
    window.setTimeout(() => playSound('unlock'), 600);
    void talk(t('wordsDone', lang), 'happy');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const steps = set.words.length * 2;
  const stepNow = phase === 'learn' ? i : phase === 'quiz' ? set.words.length + i : steps;

  return (
    <motion.main
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="relative z-10 mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col items-center gap-2 px-3 pt-2 pb-3 sm:gap-3 sm:px-4 sm:pt-3"
    >
      {/* top bar */}
      <div className="flex w-full items-center gap-3 pr-12">
        <button onClick={onHome} aria-label={t('home', lang)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/80 text-ink-soft shadow-sm active:scale-90">
          <Icon name="home" size={22} />
        </button>
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-white/70 shadow-[inset_1px_2px_4px_rgb(43_39_64/0.1)]" role="progressbar" aria-valuemin={0} aria-valuemax={steps} aria-valuenow={stepNow}>
          <motion.span className="block h-full rounded-full bg-gradient-to-r from-mint to-[#0ea5e9]" animate={{ width: `${(stepNow / steps) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
      </div>

      {/* Pipo + bubble */}
      <div className="flex w-full items-end gap-1">
        <div className="-mb-1 shrink-0"><Mascot mood={mood} size={compact ? 60 : 78} /></div>
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.p key={bubble} initial={{ opacity: 0, y: 8, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              className="clay m-0 !rounded-[24px] px-4 py-2.5 text-center text-[clamp(1.05rem,4.8vw,1.6rem)] leading-tight font-extrabold" aria-live="polite">
              {bubble || '…'}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="grid min-h-0 w-full flex-1 place-items-center">
        <AnimatePresence mode="wait">
          {phase === 'learn' && (
            <motion.div key={`learn-${i}`} className="flex w-full flex-col items-center gap-3"
              initial={{ opacity: 0, x: 60, rotate: 4 }} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={{ opacity: 0, x: -60, rotate: -4 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
              <button onClick={() => void talk(tr(word.word, lang))} aria-label={tr(word.word, lang)}
                className="clay grid aspect-square w-[min(62vw,34dvh,17rem)] place-items-center !rounded-[40px] active:scale-95">
                <motion.img src={pictureUrl(word.image)} alt="" className="h-[72%] w-[72%]" draggable={false}
                  animate={{ y: [0, -8, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />
              </button>
              <p className="m-0 font-display text-[clamp(1.8rem,8vw,2.6rem)] leading-none font-black text-ink">{tr(word.word, lang)}</p>
              <div className="min-h-[8.5rem]">
                {canSpeak && (
                  <SpeakButton
                    key={`speak-${i}`}
                    lang={lang}
                    expected={tr(word.word, lang)}
                    check={child.checkSpeech !== false}
                    onDone={afterSpeak}
                    onMiss={(info) => { session.add({ ...simpleAttempt('speak', false), coverage: info.score }); setMood('encourage'); }}
                  />
                )}
              </div>
            </motion.div>
          )}

          {phase === 'quiz' && target && (
            <motion.div key={`quiz-${round}-${i}`} className="grid w-full grid-cols-3 gap-3"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              {choices.map((w) => {
                const right = rightId === w.id;
                const wrong = wrongId?.id === w.id;
                return (
                  <motion.button
                    key={w.id + (wrong ? wrongId?.n : '')}
                    onClick={() => answer(w)}
                    aria-label={tr(w.word, lang)}
                    whileTap={{ scale: 0.9 }}
                    animate={wrong ? { x: [0, -10, 10, -6, 6, 0] } : right ? { scale: [1, 1.12, 1] } : undefined}
                    transition={{ duration: 0.45 }}
                    className={`clay grid aspect-square w-full place-items-center !rounded-[28px] ${right ? 'ring-4 ring-mint' : wrong ? 'ring-4 ring-coral' : ''}`}
                  >
                    <img src={pictureUrl(w.image)} alt="" className="h-[70%] w-[70%]" draggable={false} />
                  </motion.button>
                );
              })}
              <button onClick={() => void talk(t('whereIs', lang, { word: tr(target.word, lang) }))} aria-label={t('listen', lang)}
                className="clay-btn is-white col-span-3 mx-auto mt-2 !h-14 !w-14 !rounded-full !p-0 text-blue">
                <Icon name="sound" size={26} />
              </button>
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.div key="done" className="relative flex w-full flex-col items-center gap-4" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <Confetti />
              <div className="grid grid-cols-4 gap-2">
                {set.words.map((w, k) => (
                  <motion.span key={w.id} className="clay grid h-16 w-16 place-items-center !rounded-[20px] sm:h-20 sm:w-20"
                    initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.2 + k * 0.1 }}>
                    <img src={pictureUrl(w.image)} alt="" className="h-[70%] w-[70%]" />
                  </motion.span>
                ))}
              </div>
              <h1 className="m-0 text-center text-[clamp(1.5rem,6.5vw,2.4rem)] leading-tight font-black text-pink">{t('wordsDone', lang)}</h1>
              <div className={`grid w-full max-w-sm gap-3 ${next ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {next && (
                  <button onClick={() => onNext(next)} className="clay-btn is-sun !flex-col !gap-1 !rounded-[26px] !py-3">
                    <Icon name="next" size={30} /><span>{tr(next.title, lang)}</span>
                  </button>
                )}
                <button onClick={onHome} className="clay-btn is-white !flex-col !gap-1 !rounded-[26px] !py-3 text-blue">
                  <Icon name="home" size={30} /><span>{t('finish', lang)}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
