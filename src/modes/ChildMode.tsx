import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Blobs, Confetti } from '../components/Decor';
import { Icon } from '../components/Icon';
import { Mascot, type Mood } from '../components/Mascot';
import { Slate } from '../components/Slate';
import { loadLessons } from '../content';
import { evaluateAttempt } from '../engine/evaluate';
import { speak, stopSpeaking } from '../engine/speech';
import type { FeedbackKey, Lang, Lesson, Point } from '../engine/types';
import { t, tr, type UIKey } from '../i18n';
import { newId, type AppData, type AttemptRecord, type Child, type SessionRecord } from '../storage/store';

interface Props {
  child: Child | null;
  update: (fn: (d: AppData) => AppData) => void;
  onParent: () => void;
}

type Screen = { kind: 'welcome' } | { kind: 'lesson'; lesson: Lesson; run: number } | { kind: 'complete'; lesson: Lesson };

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const;
const screenMotion = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: spring },
  exit: { opacity: 0, y: -16, transition: { duration: 0.18 } },
};

/** Mascot "talks" for a moment whenever it says something. */
function useTalk(): [Mood, (lang: Lang, text: string, after?: Mood) => void, (m: Mood) => void] {
  const [mood, setMood] = useState<Mood>('idle');
  const timer = useRef<number>();
  const say = (lang: Lang, text: string, after: Mood = 'idle') => {
    speak(text, lang);
    window.clearTimeout(timer.current);
    setMood('talk');
    timer.current = window.setTimeout(() => setMood(after), Math.min(3200, 700 + text.length * 45));
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [mood, say, setMood];
}

export function ChildMode({ child, update, onParent }: Props) {
  const lang = child?.childLang ?? 'fr';
  const lessons = loadLessons();
  const today = lessons.find((l) => l.id === child?.todayLessonId) ?? null;
  const [screen, setScreen] = useState<Screen>({ kind: 'welcome' });
  const runRef = useRef(0);
  const startLesson = (lesson: Lesson) => setScreen({ kind: 'lesson', lesson, run: ++runRef.current });

  return (
    <div className="relative isolate flex min-h-full flex-col overflow-hidden bg-canvas font-display text-ink select-none">
      <Blobs />
      <button
        onClick={() => { stopSpeaking(); onParent(); }}
        aria-label={t('parentArea', lang)}
        className="absolute top-3 right-3 z-20 grid h-12 w-12 place-items-center rounded-full text-ink-soft/50 transition hover:text-ink-soft active:scale-90"
      >
        <Icon name="lock" size={22} />
      </button>

      <AnimatePresence mode="wait">
        {screen.kind === 'welcome' && (
          <Welcome key="welcome" child={child} lesson={today} lang={lang} onStart={() => today && startLesson(today)} />
        )}
        {screen.kind === 'lesson' && child && (
          <LessonPlayer
            key={`run-${screen.run}`}
            lesson={screen.lesson}
            child={child}
            update={update}
            onHome={() => { stopSpeaking(); setScreen({ kind: 'welcome' }); }}
            onDone={() => setScreen({ kind: 'complete', lesson: screen.lesson })}
          />
        )}
        {screen.kind === 'complete' && (
          <Completion
            key="complete"
            lesson={screen.lesson}
            lang={lang}
            onAgain={() => startLesson(screen.lesson)}
            onNext={() => {
              const i = lessons.findIndex((l) => l.id === screen.lesson.id);
              const next = lessons[(i + 1) % lessons.length];
              update((d) => ({ ...d, children: d.children.map((c) => (c.id === child?.id ? { ...c, todayLessonId: next.id } : c)) }));
              startLesson(next);
            }}
            onFinish={() => setScreen({ kind: 'welcome' })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Welcome({ child, lesson, lang, onStart }: { child: Child | null; lesson: Lesson | null; lang: Lang; onStart: () => void }) {
  const [mood, say] = useTalk();
  const greeting = lesson ? t('childWelcome', lang, { name: child?.name ?? '' }) : t('noActivity', lang);
  useEffect(() => {
    const id = window.setTimeout(() => say(lang, greeting), 450);
    return () => { window.clearTimeout(id); stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, lang]);

  return (
    <motion.main {...screenMotion} className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center">
        <SpeechBubble text={greeting} />
        <Mascot mood={mood} size={132} />
      </div>

      {lesson && (
        <motion.button
          onClick={onStart}
          aria-label={`${tr(lesson.title, lang)}. ${t('tapToStart', lang)}`}
          className="clay relative grid aspect-square w-[min(68vw,300px)] place-items-center !rounded-[48px]"
          initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1, transition: { ...spring, delay: 0.15 } }}
          whileTap={{ scale: 0.94 }}
        >
          <span className="bg-gradient-to-b from-blue to-violet bg-clip-text text-[min(46vw,200px)] leading-none font-black text-transparent">
            {lesson.target}
          </span>
          <motion.span
            className="absolute -right-5 -bottom-5 grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-sun text-ink shadow-[0_8px_0_var(--color-sun-deep),0_16px_24px_-8px_rgb(217_119_6/0.6)]"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon name="play" size={44} />
          </motion.span>
        </motion.button>
      )}
    </motion.main>
  );
}

function SpeechBubble({ text }: { text: string }) {
  return (
    <div className="relative mb-2 min-h-[3.5rem] max-w-[min(88vw,26rem)]" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.p
          key={text}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 24 } }}
          exit={{ opacity: 0, y: -6, scale: 0.95, transition: { duration: 0.12 } }}
          className="clay relative m-0 !rounded-[26px] px-5 py-3 text-center text-[clamp(1.25rem,5vw,1.7rem)] leading-tight font-extrabold text-ink"
        >
          {text}
          <span className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-[3px] bg-white" aria-hidden="true" />
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const STEP_LABEL: Record<Lesson['activities'][number]['type'], UIKey> = {
  intro: 'stepIntro', demonstration: 'stepDemo', trace: 'stepTrace', free_write: 'stepFree',
};

interface PlayerProps {
  lesson: Lesson;
  child: Child;
  update: (fn: (d: AppData) => AppData) => void;
  onDone: () => void;
  onHome: () => void;
}

function LessonPlayer({ lesson, child, update, onDone, onHome }: PlayerProps) {
  const lang = child.childLang;
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [misses, setMisses] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [demoDone, setDemoDone] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [glow, setGlow] = useState(false);
  const [mood, say, setMood] = useTalk();
  const sessionId = useRef(newId());
  const created = useRef(false);
  const activity = lesson.activities[index];

  // Create the practice session record when the lesson starts (once)
  useEffect(() => {
    if (created.current) return;
    created.current = true;
    const session: SessionRecord = {
      id: sessionId.current, childId: child.id, lessonId: lesson.id,
      startedAt: Date.now(), endedAt: null, completed: false, attempts: [],
    };
    update((d) => ({ ...d, sessions: [...d.sessions, session] }));
  }, [child.id, lesson.id, update]);

  // Say each step's instruction
  useEffect(() => {
    setMessage(null);
    setAttempts(0);
    setMisses(0);
    setDemoDone(false);
    setReplaying(false);
    say(lang, tr(activity.say, lang));
    return stopSpeaking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const advance = () => {
    if (index + 1 < lesson.activities.length) {
      setIndex(index + 1);
      setResetKey((k) => k + 1);
    } else {
      update((d) => ({
        ...d,
        sessions: d.sessions.map((s) => (s.id === sessionId.current ? { ...s, completed: true, endedAt: Date.now() } : s)),
      }));
      onDone();
    }
  };

  const feedback = (key: FeedbackKey, after: Mood) => {
    const text = tr(lesson.feedback[key], lang);
    setMessage(text);
    say(lang, text, after);
  };

  const handleAttempt = (drawn: Point[][]) => {
    if (activity.type !== 'trace' && activity.type !== 'free_write') return;
    const metrics = evaluateAttempt(lesson.strokes, drawn, { tolerance: activity.type === 'trace' ? 0.08 : 0.11 });
    if (metrics.outcome === 'no_attempt') {
      say(lang, tr(activity.say, lang));
      setResetKey((k) => k + 1);
      return;
    }
    const n = attempts + 1;
    setAttempts(n);
    const hint = metrics.outcome !== 'success' && !metrics.startOk && activity.guide !== 'none';
    const record: AttemptRecord = { ...metrics, activity: activity.type, hintShown: hint, at: Date.now() };
    update((d) => ({
      ...d,
      sessions: d.sessions.map((s) => (s.id === sessionId.current ? { ...s, endedAt: Date.now(), attempts: [...s.attempts, record] } : s)),
    }));

    if (metrics.outcome === 'success') {
      setGlow(true);
      feedback('success', 'happy');
      setMood('happy');
      window.setTimeout(() => { setGlow(false); advance(); }, 2000);
    } else if (n >= activity.maxAttempts) {
      feedback('moveOn', 'happy');
      window.setTimeout(advance, 2200);
    } else {
      const m = misses + 1;
      setMisses(m);
      feedback(hint ? 'hintStart' : metrics.outcome === 'uncertain' ? 'uncertain' : 'retry', 'encourage');
      window.setTimeout(() => {
        setResetKey((k) => k + 1);
        // Adaptive help (PRD §16): after two misses while tracing, show the demonstration again.
        if (activity.type === 'trace' && m === 2) {
          setReplaying(true);
          const again = t('watchAgainSay', lang);
          setMessage(again);
          say(lang, again);
        } else {
          setMessage(null);
        }
      }, 1900);
    }
  };

  const isPractice = activity.type === 'trace' || activity.type === 'free_write';
  const slateMode = replaying ? 'demo' : activity.type === 'intro' ? 'show' : activity.type === 'demonstration' ? 'demo' : activity.type === 'trace' ? 'trace' : 'free';
  const guide = isPractice && !replaying ? (activity as { guide: 'strong' | 'faint' | 'none' }).guide : 'strong';
  const showNext = !isPractice && (activity.type !== 'demonstration' || demoDone);
  const bubble = message ?? tr(activity.say, lang);

  return (
    <motion.main {...screenMotion} className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-3 px-4 pt-3 pb-6">
      {/* top bar: home + steps */}
      <div className="flex w-full items-center gap-3 pr-12">
        <button onClick={onHome} aria-label={t('home', lang)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/80 text-ink-soft shadow-sm active:scale-90">
          <Icon name="home" size={22} />
        </button>
        <ol className="flex flex-1 items-center justify-center gap-2" aria-label={t('steps', lang)}>
          {lesson.activities.map((a, i) => (
            <li key={i} aria-current={i === index ? 'step' : undefined} className="flex items-center">
              <motion.span
                layout
                className={`block h-3.5 rounded-full ${i < index ? 'bg-mint' : i === index ? 'bg-sun shadow-[0_0_0_3px_white,0_0_0_5px_var(--color-sun)]' : 'bg-[#d6cbf2]'}`}
                animate={{ width: i === index ? 40 : 14 }}
                transition={spring}
              />
              <span className="sr-only">{t(STEP_LABEL[a.type], lang)}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* mascot + bubble */}
      <div className="flex w-full items-end justify-center gap-1">
        <div className="shrink-0 -mb-1"><Mascot mood={mood} size={78} /></div>
        <div className="flex-1"><SpeechBubble text={bubble} /></div>
      </div>

      {/* board */}
      <motion.div
        className="w-full"
        animate={glow ? { scale: [1, 1.04, 1], rotate: [0, -1.5, 1.5, 0] } : { scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className={`rounded-[40px] p-1.5 transition-colors duration-300 ${glow ? 'bg-mint' : 'bg-transparent'}`}>
          <Slate
            strokes={lesson.strokes}
            mode={slateMode}
            guide={guide}
            resetKey={resetKey}
            onAttempt={handleAttempt}
            onDemoEnd={() => {
              if (replaying) {
                setReplaying(false);
                setMessage(null);
                setResetKey((k) => k + 1);
                say(lang, tr(activity.say, lang));
              } else setDemoDone(true);
            }}
          />
        </div>
      </motion.div>

      {/* actions */}
      <div className="mt-1 flex min-h-24 items-center justify-center gap-5">
        <RoundButton label={t('listen', lang)} icon="sound" onClick={() => say(lang, bubble)} />
        {activity.type === 'demonstration' && demoDone && (
          <RoundButton label={t('watchDemo', lang)} icon="replay" onClick={() => { setDemoDone(false); setResetKey((k) => k + 1); }} />
        )}
        {isPractice && !replaying && (
          <RoundButton label={t('clear', lang)} icon="erase" onClick={() => { setMessage(null); setResetKey((k) => k + 1); }} />
        )}
        <AnimatePresence>
          {showNext && (
            <motion.button
              key="next"
              onClick={advance}
              aria-label={t('next', lang)}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 380, damping: 16 } }}
              exit={{ scale: 0 }}
              className="clay-btn is-sun !h-24 !w-24 !rounded-full !p-0"
            >
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                <Icon name="play" size={46} />
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}

function RoundButton({ label, icon, onClick }: { label: string; icon: 'sound' | 'replay' | 'erase'; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="clay-btn is-white !h-16 !w-16 !rounded-full !p-0 text-blue">
      <Icon name={icon} size={30} />
    </button>
  );
}

/* ------------------------------------------------------------------ */

function Completion({ lesson, lang, onAgain, onNext, onFinish }: {
  lesson: Lesson; lang: Lang; onAgain: () => void; onNext: () => void; onFinish: () => void;
}) {
  const [mood, say, setMood] = useTalk();
  useEffect(() => {
    setMood('happy');
    const id = window.setTimeout(() => say(lang, tr(lesson.completion, lang), 'happy'), 500);
    return () => { window.clearTimeout(id); stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.main {...screenMotion} className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
      <div className="relative grid place-items-center">
        <Confetti />
        <motion.div
          className="relative grid h-52 w-52 place-items-center"
          initial={{ scale: 0, rotate: -120 }}
          animate={{ scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 12, delay: 0.1 } }}
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-[0_12px_18px_rgb(217_119_6/0.45)]" aria-hidden="true">
            <path d="M50 4l12.6 27.4 29.9 3.3-22.3 20.3 6.2 29.5L50 69.4 23.6 84.5l6.2-29.5L7.5 34.7l29.9-3.3L50 4Z" fill="#fbbf24" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
          </svg>
          <span className="relative mt-3 text-7xl font-black text-white [text-shadow:0_3px_0_var(--color-sun-deep)]">{lesson.target}</span>
        </motion.div>
      </div>

      <motion.h1
        className="m-0 max-w-[16ch] text-center text-[clamp(1.8rem,7vw,2.6rem)] leading-tight font-black text-pink"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { ...spring, delay: 0.35 } }}
      >
        {tr(lesson.completion, lang)}
      </motion.h1>
      <Mascot mood={mood} size={96} />

      <motion.div
        className="mt-2 grid w-full max-w-sm grid-cols-3 gap-3"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.6 } } }}
      >
        {[
          { k: 'tryAgain' as const, icon: 'replay' as const, cls: 'is-white text-blue', fn: onAgain },
          { k: 'next' as const, icon: 'next' as const, cls: 'is-sun', fn: onNext },
          { k: 'finish' as const, icon: 'home' as const, cls: 'is-white text-blue', fn: onFinish },
        ].map((b) => (
          <motion.button
            key={b.k}
            onClick={b.fn}
            variants={{ hidden: { opacity: 0, y: 20, scale: 0.8 }, show: { opacity: 1, y: 0, scale: 1, transition: spring } }}
            className={`clay-btn ${b.cls} !h-full !flex-col !gap-1 !rounded-[26px] !px-2 !py-3 !text-[0.9rem]`}
          >
            <Icon name={b.icon} size={32} />
            <span className="leading-tight">{t(b.k, lang)}</span>
          </motion.button>
        ))}
      </motion.div>
    </motion.main>
  );
}
