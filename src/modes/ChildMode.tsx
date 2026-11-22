import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Blobs, Confetti } from '../components/Decor';
import { Icon } from '../components/Icon';
import { Mascot, type Mood } from '../components/Mascot';
import { Slate } from '../components/Slate';
import { loadLessons } from '../content';
import { evaluateAttempt, type FailReason } from '../engine/evaluate';
import { learningPath, masteredIds, nextInPath, previousInPath, sequentialUnlocked, unlockedIds } from '../engine/progress';
import { loadReels, loadWordSets, pictureUrl, talkKey, wordsKey, type Reel, type WordSet } from '../content/speak';
import { TalkReels } from './TalkReels';
import { WordsPlayer } from './WordsPlayer';
import { playSound, speak, speakFeedback, stopSpeaking } from '../engine/speech';
import type { FeedbackKey, Lang, Lesson, Point } from '../engine/types';
import { t, tr, type UIKey } from '../i18n';
import { newId, type AppData, type AttemptRecord, type Child, type SessionRecord } from '../storage/store';

interface Props {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  onParent: () => void;
}

type Screen =
  | { kind: 'welcome' }
  | { kind: 'lesson'; lesson: Lesson; run: number }
  | { kind: 'complete'; lesson: Lesson }
  | { kind: 'words'; set: WordSet; run: number }
  | { kind: 'talk'; index: number; run: number };

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const;
const screenMotion = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: spring },
  exit: { opacity: 0, y: -16, transition: { duration: 0.18 } },
};

/** True on phones and short screens: use the compact mobile layout. */
function useCompact() {
  const query = '(max-width: 639px), (max-height: 720px)';
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setCompact(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return compact;
}

/** Mascot "talks" for a moment whenever it says something. */
type Verdict = 'success' | 'miss';

function useTalk(): [Mood, (lang: Lang, text: string, after?: Mood, verdict?: Verdict) => void, (m: Mood) => void] {
  const [mood, setMood] = useState<Mood>('idle');
  const timer = useRef<number>();
  // verdict: speak "Bravo !" / "Faux !" clearly with a sound before the rest of the sentence
  const say = (lang: Lang, text: string, after: Mood = 'idle', verdict?: Verdict) => {
    if (verdict) speakFeedback(text, lang, verdict === 'success');
    else speak(text, lang);
    window.clearTimeout(timer.current);
    setMood('talk');
    timer.current = window.setTimeout(() => setMood(after), Math.min(3200, 700 + text.length * 45));
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [mood, say, setMood];
}

export function ChildMode({ data, update, onParent }: Props) {
  const child = data.children.find((c) => c.id === data.activeChildId) ?? null;
  const lang = child?.childLang ?? 'fr';
  const lessons = loadLessons();
  const mastered = masteredIds(data.sessions, child?.id);
  const unlocked = unlockedIds(lessons, data.sessions, child);
  // The big card: the parent's choice if it is open and not yet mastered, otherwise the next lesson to learn.
  const chosen = lessons.find((l) => l.id === child?.todayLessonId && unlocked.has(l.id) && !mastered.has(l.id));
  const nextToLearn = Object.values(learningPath(lessons)).flat().find((l) => unlocked.has(l.id) && !mastered.has(l.id));
  const today = chosen ?? nextToLearn ?? null;
  const [screen, setScreen] = useState<Screen>({ kind: 'welcome' });
  const runRef = useRef(0);
  const startLesson = (lesson: Lesson) => {
    openBefore.current = unlocked;
    setScreen({ kind: 'lesson', lesson, run: ++runRef.current });
  };
  // Speaking spaces: word sets and conversation reels, each unlocking one after the other
  const wordSets = loadWordSets();
  const reels = loadReels();
  const wordsOpen = sequentialUnlocked(wordSets.map((w) => wordsKey(w.id)), mastered, child?.unlockAll);
  // Conversations unlock one after the other inside each theme (the first of every theme is open,
  // so "Les toilettes" is available right away).
  const reelsOpen = new Set(
    [...new Set(reels.map((r) => r.theme))].flatMap((theme) => [
      ...sequentialUnlocked(reels.filter((r) => r.theme === theme).map((r) => talkKey(r.id)), mastered, child?.unlockAll),
    ]),
  );
  const compactLayout = useCompact();

  // Remember what was open before the lesson, to announce what the child just unlocked.
  const openBefore = useRef<Set<string>>(unlocked);

  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden bg-canvas pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-display text-ink select-none">
      <Blobs />
      <button
        onClick={() => { stopSpeaking(); onParent(); }}
        aria-label={t('parentArea', lang)}
        className="absolute top-[calc(env(safe-area-inset-top)+0.5rem)] right-2 z-20 grid h-12 w-12 place-items-center rounded-full text-ink-soft/50 transition hover:text-ink-soft active:scale-90"
      >
        <Icon name="lock" size={22} />
      </button>

      <AnimatePresence mode="wait">
        {screen.kind === 'welcome' && (
          <Welcome
            key={`welcome-${child?.id}`}
            data={data}
            child={child}
            today={today}
            lessons={lessons}
            done={mastered}
            unlocked={unlocked}
            lang={lang}
            onPick={startLesson}
            onSwitch={(id) => update((d) => ({ ...d, activeChildId: id }))}
            wordSets={wordSets}
            reels={reels}
            wordsOpen={wordsOpen}
            reelsOpen={reelsOpen}
            onPickSet={(set) => setScreen({ kind: 'words', set, run: ++runRef.current })}
            onPickReel={(index) => setScreen({ kind: 'talk', index, run: ++runRef.current })}
          />
        )}
        {screen.kind === 'words' && child && (
          <WordsPlayer
            key={`words-${screen.run}`}
            set={screen.set}
            child={child}
            update={update}
            compact={compactLayout}
            next={wordSets[wordSets.findIndex((w) => w.id === screen.set.id) + 1] ?? null}
            onHome={() => { stopSpeaking(); setScreen({ kind: 'welcome' }); }}
            onNext={(set) => setScreen({ kind: 'words', set, run: ++runRef.current })}
          />
        )}
        {screen.kind === 'talk' && child && (
          <TalkReels
            key={`talk-${screen.run}`}
            reels={reels}
            start={screen.index}
            child={child}
            unlocked={new Set(reels.filter((r) => reelsOpen.has(talkKey(r.id))).map((r) => r.id))}
            update={update}
            onHome={() => { stopSpeaking(); setScreen({ kind: 'welcome' }); }}
          />
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
            next={nextInPath(lessons, screen.lesson)}
            justUnlocked={(() => {
              const n = nextInPath(lessons, screen.lesson);
              return !!n && unlocked.has(n.id) && !openBefore.current.has(n.id);
            })()}
            onAgain={() => startLesson(screen.lesson)}
            onNext={(n) => startLesson(n)}
            onFinish={() => setScreen({ kind: 'welcome' })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Themes of the "Parler" tab, in order, with a picture for each. */
const THEMES: { k: string; label: UIKey; icon: string }[] = [
  { k: 'greet', label: 'themeGreet', icon: '1f44b' },
  { k: 'needs', label: 'themeNeeds', icon: '1f6bd' },
  { k: 'feelings', label: 'themeFeelings', icon: '1f60a' },
  { k: 'polite', label: 'themePolite', icon: '1f64f' },
  { k: 'house', label: 'themeHouse', icon: '1f3e0' },
];

const TILE_COLORS = [
  'from-blue to-violet', 'from-pink to-[#f97362]', 'from-mint to-[#0ea5e9]', 'from-sun to-[#f97316]', 'from-violet to-pink',
];

interface WelcomeProps {
  wordSets: WordSet[];
  reels: Reel[];
  wordsOpen: Set<string>;
  reelsOpen: Set<string>;
  onPickSet: (s: WordSet) => void;
  onPickReel: (index: number) => void;
  data: AppData;
  child: Child | null;
  today: Lesson | null;
  lessons: Lesson[];
  done: Set<string>;
  unlocked: Set<string>;
  lang: Lang;
  onPick: (l: Lesson) => void;
  onSwitch: (childId: string) => void;
}

function Welcome({ data, child, today, lessons, done, unlocked, lang, onPick, onSwitch, wordSets, reels, wordsOpen, reelsOpen, onPickSet, onPickReel }: WelcomeProps) {
  const [mood, say] = useTalk();
  const compact = useCompact();
  const [group, setGroup] = useState<string>(today?.group ?? 'numbers');
  const [switching, setSwitching] = useState(false);
  const [refused, setRefused] = useState<{ id: string; n: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // A locked tile: Pipo says which one to master first.
  const pick = (l: Lesson) => {
    if (unlocked.has(l.id)) return onPick(l);
    const before = previousInPath(lessons, l);
    setRefused((r) => ({ id: l.id, n: (r?.n ?? 0) + 1 }));
    const text = t('lockedSay', lang, { target: before?.target ?? '' });
    setNote(text);
    say(lang, text, 'encourage');
  };
  const greeting = child ? t('childWelcome', lang, { name: child.name }) : t('noActivity', lang);
  useEffect(() => {
    const id = window.setTimeout(() => say(lang, greeting), 450);
    return () => { window.clearTimeout(id); stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, lang]);

  const groups: { k: string; label: UIKey; sample: string }[] = [
    { k: 'numbers', label: 'numbers', sample: '123' },
    { k: 'letters', label: 'letters', sample: 'ABC' },
    { k: 'words', label: 'words', sample: '' },
    { k: 'talk', label: 'talk', sample: '' },
  ];
  const shown = lessons.filter((l) => l.group === group);
  const others = data.children.filter((c) => c.id !== child?.id);

  return (
    <motion.main {...screenMotion} className="relative z-10 min-h-0 w-full flex-1 overflow-y-auto overscroll-contain">
     <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 pt-2 pb-8 sm:gap-5 sm:pt-3">
      {/* profile */}
      <div className="flex w-full items-center pr-12">
        {child && (
          <button
            onClick={() => others.length && setSwitching((v) => !v)}
            className="flex items-center gap-2 rounded-full bg-white/85 py-1.5 pr-4 pl-1.5 shadow-[0_6px_16px_-8px_rgb(76_56_140/0.4)] active:scale-95"
            aria-label={others.length ? t('whoPlays', lang) : child.name}
            aria-expanded={others.length ? switching : undefined}
          >
            <Avatar child={child} size={40} />
            <span className="max-w-[40vw] truncate text-lg font-black">{child.name}</span>
          </button>
        )}
      </div>
      <AnimatePresence>
        {switching && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="clay -mt-2 flex w-full flex-wrap items-center justify-center gap-4 p-4"
          >
            <p className="m-0 w-full text-center text-lg font-black">{t('whoPlays', lang)}</p>
            {data.children.map((c) => (
              <button key={c.id} onClick={() => { onSwitch(c.id); setSwitching(false); }}
                className={`flex flex-col items-center gap-1 rounded-[22px] p-2 active:scale-95 ${c.id === child?.id ? 'bg-blue-soft' : ''}`}>
                <Avatar child={c} size={64} ring />
                <span className="text-base font-extrabold">{c.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pipo + today's activity */}
      {compact ? (
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full items-end gap-1">
            <div className="-mb-1 shrink-0"><Mascot mood={mood} size={68} /></div>
            <div className="min-w-0 flex-1"><SpeechBubble text={note ?? greeting} /></div>
          </div>
          {today && child && (
            <motion.button
              onClick={() => onPick(today)}
              aria-label={`${tr(today.title, lang)}. ${t('tapToStart', lang)}`}
              className="clay relative flex w-full items-center gap-4 !rounded-[30px] p-3 pr-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { ...spring, delay: 0.1 } }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="relative grid h-20 w-20 shrink-0 place-items-center rounded-[22px] bg-canvas">
                <Icon name="sparkle" size={18} className="absolute top-1.5 left-1.5 text-sun" />
                <span className={`bg-gradient-to-b from-blue to-violet bg-clip-text leading-none font-black text-transparent ${today.target.length > 1 ? 'text-[2.6rem]' : 'text-[3.4rem]'}`}>{today.target}</span>
              </span>
              <span className="min-w-0 flex-1 text-left text-lg leading-tight font-black">{tr(today.title, lang)}</span>
              <motion.span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-white bg-sun text-ink shadow-[0_5px_0_var(--color-sun-deep),0_10px_18px_-8px_rgb(217_119_6/0.6)]"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Icon name="play" size={30} />
              </motion.span>
            </motion.button>
          )}
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-center">
          <div className="flex flex-col items-center">
            <SpeechBubble text={note ?? greeting} />
            <Mascot mood={mood} size={112} />
          </div>
          {today && child && (
            <motion.button
              onClick={() => onPick(today)}
              aria-label={`${tr(today.title, lang)}. ${t('tapToStart', lang)}`}
              className="clay relative grid aspect-square w-[min(54vw,220px)] place-items-center !rounded-[44px]"
              initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1, transition: { ...spring, delay: 0.15 } }}
              whileTap={{ scale: 0.94 }}
            >
              <Icon name="sparkle" size={26} className="absolute top-4 left-4 text-sun" />
              <span className={`bg-gradient-to-b from-blue to-violet bg-clip-text leading-none font-black text-transparent ${today.target.length > 1 ? 'text-[min(26vw,110px)]' : 'text-[min(36vw,150px)]'}`}>
                {today.target}
              </span>
              <motion.span
                className="absolute -right-4 -bottom-4 grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-sun text-ink shadow-[0_7px_0_var(--color-sun-deep),0_14px_22px_-8px_rgb(217_119_6/0.6)]"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Icon name="play" size={38} />
              </motion.span>
            </motion.button>
          )}
        </div>
      )}

      {/* free choice: numbers / letters */}
      {child && (
        <section className="mt-3 w-full" aria-label={t('chooseTitle', lang)}>
          <div className="mx-auto mb-3 grid w-full max-w-lg grid-cols-4 gap-1 rounded-[26px] bg-white/80 p-1.5 shadow-[inset_2px_3px_6px_rgb(43_39_64/0.08)] sm:mb-4" role="tablist">
            {groups.map((g) => {
              const on = group === g.k;
              return (
                <button key={g.k} role="tab" aria-selected={on} onClick={() => setGroup(g.k)}
                  className={`relative flex min-h-16 flex-col items-center justify-center rounded-[20px] px-1 font-black transition-colors ${on ? 'text-white' : 'text-ink-soft'}`}>
                  {on && <motion.span layoutId="group-pill" className="absolute inset-0 rounded-[20px] bg-blue shadow-[inset_0_-4px_0_rgb(0_0_0/0.15)]" transition={spring} />}
                  <span className="relative grid h-8 place-items-center text-[1.45rem] leading-none tracking-tight">
                    {g.k === 'words' ? <img src={pictureUrl('1f408')} alt="" className="h-8 w-8" />
                      : g.k === 'talk' ? <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" opacity=".9" /><circle cx="8" cy="10.5" r="1.4" fill={on ? '#2563eb' : '#fff'} /><circle cx="12" cy="10.5" r="1.4" fill={on ? '#2563eb' : '#fff'} /><circle cx="16" cy="10.5" r="1.4" fill={on ? '#2563eb' : '#fff'} /></svg>
                      : g.sample}
                  </span>
                  <span className="relative mt-0.5 text-[0.8rem] leading-tight sm:text-sm">{t(g.label, lang)}</span>
                </button>
              );
            })}
          </div>

          {group === 'words' && (
            <motion.ul key="words" className="m-0 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-4" initial="hidden" animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
              {wordSets.map((ws) => {
                const key = wordsKey(ws.id);
                const locked = !wordsOpen.has(key);
                const wiggle = refused?.id === key;
                return (
                  <motion.li key={ws.id} variants={{ hidden: { opacity: 0, scale: 0.6, y: 14 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 20 } } }}>
                    <motion.button
                      key={wiggle ? `w${refused?.n}` : 'still'}
                      onClick={() => {
                        if (!locked) return onPickSet(ws);
                        const before = wordSets[wordSets.indexOf(ws) - 1];
                        setRefused((r) => ({ id: key, n: (r?.n ?? 0) + 1 }));
                        const text = t('lockedWords', lang, { title: before ? tr(before.title, lang) : '' });
                        setNote(text);
                        say(lang, text, 'encourage');
                      }}
                      whileTap={{ scale: 0.9 }}
                      animate={wiggle ? { rotate: [0, -8, 8, -5, 5, 0] } : undefined}
                      aria-label={locked ? `${tr(ws.title, lang)} (${t('lockedLabel', lang)})` : tr(ws.title, lang)}
                      aria-disabled={locked}
                      className={`clay relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 !rounded-[24px] p-2 ${locked ? '!bg-[#ece8f6] !shadow-none' : ''}`}
                    >
                      <span className={`grid grid-cols-2 gap-1 ${locked ? 'opacity-35 grayscale' : ''}`}>
                        {ws.words.map((w) => <img key={w.id} src={pictureUrl(w.image)} alt="" className="h-[clamp(1.6rem,8vw,2.4rem)] w-[clamp(1.6rem,8vw,2.4rem)]" />)}
                      </span>
                      <span className={`text-center text-[0.8rem] leading-tight font-black sm:text-sm ${locked ? 'text-[#b9b0d3]' : 'text-ink'}`}>{tr(ws.title, lang)}</span>
                      {locked && (
                        <span className="absolute -right-1.5 -bottom-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-canvas bg-white text-ink-soft shadow-sm" aria-hidden="true"><Icon name="lock" size={13} /></span>
                      )}
                      {done.has(key) && (
                        <span className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full border-[3px] border-white bg-sun text-white shadow-md" aria-hidden="true"><Icon name="sparkle" size={16} /></span>
                      )}
                    </motion.button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}

          {group === 'talk' && (
            <div className="flex flex-col gap-5">
            {THEMES.filter((th) => reels.some((r) => r.theme === th.k)).map((th) => (
            <section key={th.k} aria-label={t(th.label, lang)}>
            <h3 className="m-0 mb-2 flex items-center gap-2 px-1 text-lg font-black text-ink">
              <img src={pictureUrl(th.icon)} alt="" className="h-7 w-7" />{t(th.label, lang)}
            </h3>
            <motion.ul key="talk" className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3" initial="hidden" animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
              {reels.map((r, k) => ({ r, k })).filter(({ r }) => r.theme === th.k).map(({ r, k }) => {
                const key = talkKey(r.id);
                const locked = !reelsOpen.has(key);
                const wiggle = refused?.id === key;
                return (
                  <motion.li key={r.id} variants={{ hidden: { opacity: 0, scale: 0.6, y: 14 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 20 } } }}>
                    <motion.button
                      key={wiggle ? `w${refused?.n}` : 'still'}
                      onClick={() => {
                        if (!locked) return onPickReel(k);
                        setRefused((x) => ({ id: key, n: (x?.n ?? 0) + 1 }));
                        const text = t('finishReelFirst', lang);
                        setNote(text);
                        say(lang, text, 'encourage');
                      }}
                      whileTap={{ scale: 0.92 }}
                      animate={wiggle ? { rotate: [0, -6, 6, -4, 4, 0] } : undefined}
                      aria-label={locked ? `${tr(r.title, lang)} (${t('lockedLabel', lang)})` : tr(r.title, lang)}
                      aria-disabled={locked}
                      className={`clay relative flex w-full items-center gap-2 !rounded-[24px] p-3 text-left ${locked ? '!bg-[#ece8f6] !shadow-none' : ''}`}
                    >
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-canvas ${locked ? 'opacity-35 grayscale' : ''}`}>
                        <img src={pictureUrl(r.prop)} alt="" className="h-9 w-9" />
                      </span>
                      <span className={`min-w-0 text-[0.95rem] leading-tight font-black ${locked ? 'text-[#b9b0d3]' : 'text-ink'}`}>{tr(r.title, lang)}</span>
                      {locked && (
                        <span className="absolute -right-1.5 -bottom-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-canvas bg-white text-ink-soft shadow-sm" aria-hidden="true"><Icon name="lock" size={13} /></span>
                      )}
                      {done.has(key) && (
                        <span className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full border-[3px] border-white bg-sun text-white shadow-md" aria-hidden="true"><Icon name="sparkle" size={16} /></span>
                      )}
                    </motion.button>
                  </motion.li>
                );
              })}
            </motion.ul>
            </section>
            ))}
            </div>
          )}

          {(group === 'numbers' || group === 'letters') && (
          <motion.ul
            key={group}
            className={`m-0 grid list-none gap-3 p-0 ${group === 'letters' ? 'grid-cols-5' : 'grid-cols-4 sm:grid-cols-6'}`}
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.03 } } }}
          >
            {shown.map((l, i) => {
              const isToday = l.id === today?.id;
              const locked = !unlocked.has(l.id);
              const wiggle = refused?.id === l.id;
              return (
                <motion.li key={l.id} variants={{ hidden: { opacity: 0, scale: 0.6, y: 14 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 20 } } }}>
                  <motion.button
                    key={wiggle ? `w${refused?.n}` : 'still'}
                    onClick={() => pick(l)}
                    whileTap={{ scale: 0.88 }}
                    animate={wiggle ? { rotate: [0, -10, 10, -6, 6, 0] } : undefined}
                    transition={{ duration: 0.45 }}
                    aria-label={locked ? `${tr(l.title, lang)} (${t('lockedLabel', lang)})` : tr(l.title, lang)}
                    aria-disabled={locked}
                    className={`clay relative grid aspect-square w-full place-items-center !rounded-[24px] ${isToday ? 'ring-4 ring-sun' : ''} ${locked ? '!bg-[#ece8f6] !shadow-none' : ''}`}
                  >
                    <span className={`leading-none font-black ${locked ? 'text-[#b9b0d3]' : `bg-gradient-to-b ${TILE_COLORS[i % TILE_COLORS.length]} bg-clip-text text-transparent`} ${l.target.length > 1 ? 'text-[clamp(1.6rem,8vw,2.4rem)]' : 'text-[clamp(2.2rem,11vw,3.2rem)]'}`}>
                      {l.target}
                    </span>
                    {locked && (
                      <span className="absolute -right-1.5 -bottom-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-canvas bg-white text-ink-soft shadow-sm" aria-hidden="true">
                        <Icon name="lock" size={13} />
                      </span>
                    )}
                    {done.has(l.id) && (
                      <span className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full border-[3px] border-white bg-sun text-white shadow-md" aria-hidden="true">
                        <Icon name="sparkle" size={16} />
                      </span>
                    )}
                  </motion.button>
                </motion.li>
              );
            })}
          </motion.ul>
          )}
        </section>
      )}
     </div>
    </motion.main>
  );
}

function SpeechBubble({ text }: { text: string }) {
  return (
    <div className="relative mb-2 min-h-[3rem] max-w-[min(88vw,26rem)] sm:min-h-[3.5rem]" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.p
          key={text}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 24 } }}
          exit={{ opacity: 0, y: -6, scale: 0.95, transition: { duration: 0.12 } }}
          className="clay relative m-0 !rounded-[24px] px-4 py-2.5 text-center text-[clamp(1.05rem,4.8vw,1.7rem)] leading-tight font-extrabold text-ink sm:px-5 sm:py-3"
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
  const [shake, setShake] = useState(0);
  const pendingMessage = useRef<string | null>(null);
  const [mood, say, setMood] = useTalk();
  const compact = useCompact();
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
    const pending = pendingMessage.current;
    pendingMessage.current = null;
    if (pending) {
      setMessage(pending);
      say(lang, pending, 'encourage');
    } else say(lang, tr(activity.say, lang));
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
    say(lang, text, after, key === 'success' ? 'success' : undefined);
  };

  const FAIL_TEXT: Record<FailReason, UIKey> = {
    start: 'failStart', direction: 'failDirection', incomplete: 'failIncomplete', offpath: 'failOffpath',
  };

  const handleAttempt = (drawn: Point[][]) => {
    if (activity.type !== 'trace' && activity.type !== 'free_write') return;
    const metrics = evaluateAttempt(lesson.strokes, drawn, { tolerance: activity.type === 'trace' ? 0.08 : 0.11 });
    if (metrics.outcome === 'no_attempt') {
      say(lang, tr(activity.say, lang));
      setResetKey((k) => k + 1);
      return;
    }
    setAttempts(attempts + 1);
    const hint = metrics.outcome !== 'success' && metrics.reason === 'start';
    const record: AttemptRecord = { ...metrics, activity: activity.type, hintShown: hint, at: Date.now() };
    update((d) => ({
      ...d,
      sessions: d.sessions.map((s) => (s.id === sessionId.current ? { ...s, endedAt: Date.now(), attempts: [...s.attempts, record] } : s)),
    }));

    if (metrics.outcome === 'success') {
      // Written well: bravo, then the next step (or the celebration after writing alone)
      setGlow(true);
      feedback('success', 'happy');
      setMood('happy');
      window.setTimeout(() => { setGlow(false); advance(); }, 2000);
      return;
    }

    // Not written well: say clearly that it is wrong and why, then try again
    const m = misses + 1;
    setMisses(m);
    setShake((k) => k + 1);
    const failText = t(FAIL_TEXT[metrics.reason ?? 'incomplete'], lang);
    setMessage(failText);
    say(lang, failText, 'encourage', 'miss');

    window.setTimeout(() => {
      setResetKey((k) => k + 1);
      if (activity.type === 'trace' && m % 2 === 0) {
        // Adaptive help (PRD §16): every two misses while tracing, Pipo shows the movement again.
        setReplaying(true);
        const again = t('watchAgainSay', lang);
        setMessage(again);
        say(lang, again);
      } else if (activity.type === 'free_write' && m >= activity.maxAttempts) {
        // Too hard alone for now: go back to tracing on the model, then try alone again.
        const traceIndex = lesson.activities.findIndex((a) => a.type === 'trace');
        pendingMessage.current = t('backToTrace', lang);
        if (traceIndex >= 0) setIndex(traceIndex);
        setResetKey((k) => k + 1);
      } else {
        setMessage(null);
      }
    }, 2100);
  };

  const isPractice = activity.type === 'trace' || activity.type === 'free_write';
  const slateMode = replaying ? 'demo' : activity.type === 'intro' ? 'show' : activity.type === 'demonstration' ? 'demo' : activity.type === 'trace' ? 'trace' : 'free';
  const guide = isPractice && !replaying ? (activity as { guide: 'strong' | 'faint' | 'none' }).guide : 'strong';
  const showNext = !isPractice && (activity.type !== 'demonstration' || demoDone);
  const bubble = message ?? tr(activity.say, lang);

  return (
    <motion.main {...screenMotion} className="relative z-10 mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col items-center gap-2 px-3 pt-2 pb-3 sm:gap-3 sm:px-4 sm:pt-3 sm:pb-6">
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
        <div className="shrink-0 -mb-1"><Mascot mood={mood} size={compact ? 60 : 78} /></div>
        <div className="min-w-0 flex-1"><SpeechBubble text={bubble} /></div>
      </div>

      {/* board: takes all the space left, stays square, never overflows the screen */}
      <div className="grid min-h-0 w-full flex-1 place-items-center" style={{ containerType: 'size' }}>
      <motion.div
        style={{ width: 'min(100cqw, 100cqh)' }}
        animate={
          glow
            ? { scale: [1, 1.04, 1], rotate: [0, -1.5, 1.5, 0] }
            : shake
              ? { x: shake % 2 ? [0, -14, 14, -10, 10, -4, 0] : [0, 14, -14, 10, -10, 4, 0] }
              : { scale: 1 }
        }
        transition={{ duration: glow ? 0.6 : 0.45 }}
      >
        <div className={`rounded-[40px] p-1.5 transition-colors duration-300 ${glow ? 'bg-mint' : message && !glow && shake ? 'bg-coral' : 'bg-transparent'}`}>
          <Slate
            strokes={lesson.strokes}
            midline={lesson.guideLines === 'midline'}
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
      </div>

      {/* actions */}
      <div className="flex min-h-20 shrink-0 items-center justify-center gap-4 sm:mt-1 sm:min-h-24 sm:gap-5">
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
              className="clay-btn is-sun !h-20 !w-20 !rounded-full !p-0 sm:!h-24 sm:!w-24"
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
    <button onClick={onClick} aria-label={label} className="clay-btn is-white !h-14 !w-14 !rounded-full !p-0 text-blue sm:!h-16 sm:!w-16">
      <Icon name={icon} size={30} />
    </button>
  );
}

/* ------------------------------------------------------------------ */

function Completion({ lesson, lang, next, justUnlocked, onAgain, onNext, onFinish }: {
  lesson: Lesson; lang: Lang; next: Lesson | null; justUnlocked: boolean;
  onAgain: () => void; onNext: (l: Lesson) => void; onFinish: () => void;
}) {
  const [mood, say, setMood] = useTalk();
  const compact = useCompact();
  useEffect(() => {
    setMood('happy');
    const text = tr(lesson.completion, lang) + (justUnlocked && next ? ' ' + t('unlockedSay', lang, { target: next.target }) : '');
    if (justUnlocked) window.setTimeout(() => playSound('unlock'), 900);
    const id = window.setTimeout(() => say(lang, text, 'happy'), 500);
    return () => { window.clearTimeout(id); stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.main {...screenMotion} className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-y-auto px-4 py-4 sm:gap-4 sm:py-10">
      <div className="relative grid place-items-center">
        <Confetti />
        <motion.div
          className="relative grid h-[min(52vw,26dvh,13rem)] w-[min(52vw,26dvh,13rem)] place-items-center"
          initial={{ scale: 0, rotate: -120 }}
          animate={{ scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 12, delay: 0.1 } }}
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-[0_12px_18px_rgb(217_119_6/0.45)]" aria-hidden="true">
            <path d="M50 4l12.6 27.4 29.9 3.3-22.3 20.3 6.2 29.5L50 69.4 23.6 84.5l6.2-29.5L7.5 34.7l29.9-3.3L50 4Z" fill="#fbbf24" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
          </svg>
          <span className="relative mt-[6%] text-[clamp(2.4rem,8dvh,4.5rem)] font-black text-white [text-shadow:0_3px_0_var(--color-sun-deep)]">{lesson.target}</span>
        </motion.div>
      </div>

      <motion.h1
        className="m-0 max-w-[16ch] text-center text-[clamp(1.5rem,6.5vw,2.6rem)] leading-tight font-black text-pink"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { ...spring, delay: 0.35 } }}
      >
        {tr(lesson.completion, lang)}
      </motion.h1>
      {justUnlocked && next && (
        <motion.p
          className="m-0 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-lg font-black text-ink shadow-[0_6px_16px_-8px_rgb(76_56_140/0.4)]"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 14, delay: 0.9 } }}
        >
          <Icon name="sparkle" size={20} className="text-sun" />
          {t('unlockedSay', lang, { target: next.target })}
        </motion.p>
      )}
      <Mascot mood={mood} size={compact ? 70 : 96} />

      <motion.div
        className={`mt-2 grid w-full max-w-sm gap-3 ${next ? 'grid-cols-3' : 'grid-cols-2'}`}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.6 } } }}
      >
        {[
          { k: 'tryAgain' as const, icon: 'replay' as const, cls: 'is-white text-blue', fn: onAgain },
          ...(next ? [{ k: 'next' as const, icon: 'next' as const, cls: 'is-sun', fn: () => onNext(next) }] : []),
          { k: 'finish' as const, icon: 'home' as const, cls: 'is-white text-blue', fn: onFinish },
        ].map((b) => (
          <motion.button
            key={b.k}
            onClick={b.fn}
            variants={{ hidden: { opacity: 0, y: 20, scale: 0.8 }, show: { opacity: 1, y: 0, scale: 1, transition: spring } }}
            className={`clay-btn ${b.cls} !h-full !flex-col !gap-1 !rounded-[26px] !px-2 !py-2.5 !text-[0.9rem] sm:!py-3`}
          >
            <Icon name={b.icon} size={32} />
            <span className="leading-tight">{t(b.k, lang)}</span>
          </motion.button>
        ))}
      </motion.div>
    </motion.main>
  );
}
