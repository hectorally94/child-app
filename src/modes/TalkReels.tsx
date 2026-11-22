import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Confetti } from '../components/Decor';
import { Icon } from '../components/Icon';
import { Mascot, PIPO, TIKA, type Mood } from '../components/Mascot';
import { SpeakButton, type SpeakInfo } from '../components/SpeakButton';
import { personalize, pictureUrl, talkKey, type Reel, type Speaker } from '../content/speak';
import { playSound, speakAsync, stopSpeaking } from '../engine/speech';
import { t, tr } from '../i18n';
import type { AppData, Child } from '../storage/store';
import { simpleAttempt, useSession } from './WordsPlayer';

/** Background of each scene (original, simple and calm). */
const SCENES: Record<string, { sky: string; ground: string; dark?: boolean }> = {
  morning: { sky: 'linear-gradient(180deg,#fff3c4 0%,#dbe7ff 100%)', ground: '#86efac' },
  park: { sky: 'linear-gradient(180deg,#bfe6f5 0%,#e0f6ff 100%)', ground: '#4ade80' },
  kitchen: { sky: 'linear-gradient(180deg,#fde2f0 0%,#fff3c4 100%)', ground: '#fcd9b6' },
  home: { sky: 'linear-gradient(180deg,#ede4ff 0%,#fde2f0 100%)', ground: '#e9d5ff' },
  night: { sky: 'linear-gradient(180deg,#1e1b4b 0%,#4c1d95 100%)', ground: '#312e81', dark: true },
  bathroom: { sky: 'linear-gradient(180deg,#e0f6ff 0%,#d1fae5 100%)', ground: '#bae6fd' },
  bedroom: { sky: 'linear-gradient(180deg,#ede4ff 0%,#dbe7ff 100%)', ground: '#c4b5fd' },
  garden: { sky: 'linear-gradient(180deg,#bfe6f5 0%,#fff3c4 100%)', ground: '#4ade80' },
};

const VOICE: Record<Speaker, { pitch: number; rate: number }> = {
  pipo: { pitch: 1.05, rate: 0.85 },
  tika: { pitch: 1.45, rate: 0.9 },
};

interface Props {
  reels: Reel[];
  start: number;
  child: Child;
  unlocked: Set<string>;
  update: (fn: (d: AppData) => AppData) => void;
  onHome: () => void;
}

/** Vertical feed of short conversation cartoons. Swipe up = next (once the current one is repeated). */
export function TalkReels({ reels, start, child, unlocked, update, onHome }: Props) {
  const [index, setIndex] = useState(start);
  const [doneHere, setDoneHere] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState(0);
  const lang = child.childLang;
  const reel = reels[index];
  const canNext = index + 1 < reels.length && (unlocked.has(reels[index + 1].id) || doneHere.has(reel.id));

  const go = (dir: 1 | -1) => {
    stopSpeaking();
    if (dir === 1) {
      if (!canNext) {
        if (index + 1 < reels.length) {
          setHint((h) => h + 1);
          void speakAsync(t('finishReelFirst', lang), lang);
        }
        return;
      }
      setIndex(index + 1);
    } else if (index > 0) setIndex(index - 1);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -80 || info.velocity.y < -500) go(1);
    else if (info.offset.y > 80 || info.velocity.y > 500) go(-1);
  };

  return (
    <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={reel.id}
          className="absolute inset-0"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          // Swipe up / down: a pan gesture (only reads the finger), not "drag", which re-positions the layer
          // on every re-render and made the scene slide away when progress was saved.
          onPanEnd={onDragEnd}
          style={{ touchAction: 'none' }}
        >
          <ReelView
            reel={reel}
            child={child}
            update={update}
            onRepeated={() => setDoneHere((s) => new Set(s).add(reel.id))}
          />
        </motion.div>
      </AnimatePresence>

      {/* controls on top of the reel */}
      <button onClick={onHome} aria-label={t('home', lang)}
        className="absolute top-2 left-3 z-20 grid h-12 w-12 place-items-center rounded-full bg-white/85 text-ink-soft shadow-sm active:scale-90">
        <Icon name="home" size={22} />
      </button>
      <div className="absolute top-1/2 right-2 z-20 flex -translate-y-1/2 flex-col gap-3">
        <button onClick={() => go(-1)} disabled={index === 0} aria-label={t('previousReel', lang)}
          className="grid h-12 w-12 place-items-center rounded-full bg-white/80 text-ink shadow-sm disabled:opacity-30 active:scale-90">
          <Icon name="back" size={22} className="rotate-90" />
        </button>
        <motion.button key={hint} onClick={() => go(1)} aria-label={t('nextReel', lang)}
          animate={canNext ? { y: [0, 6, 0] } : hint ? { x: [0, -6, 6, 0] } : undefined}
          transition={canNext ? { duration: 1.2, repeat: Infinity } : { duration: 0.35 }}
          className={`grid h-14 w-14 place-items-center rounded-full shadow-md active:scale-90 ${canNext ? 'bg-sun text-ink' : 'bg-white/70 text-ink-soft'}`}>
          {canNext ? <Icon name="back" size={26} className="-rotate-90" /> : <Icon name="lock" size={20} />}
        </motion.button>
      </div>
      <p className="pointer-events-none absolute top-4 left-1/2 z-20 m-0 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-sm font-black text-ink-soft">
        {index + 1} / {reels.length}
      </p>
    </div>
  );
}

function ReelView({ reel, child, update, onRepeated }: { reel: Reel; child: Child; update: (fn: (d: AppData) => AppData) => void; onRepeated: () => void }) {
  const lang = child.childLang;
  const scene = SCENES[reel.scene] ?? SCENES.home;
  const session = useSession(update, child.id, talkKey(reel.id));
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [line, setLine] = useState<string>('');
  const [phase, setPhase] = useState<'play' | 'repeat' | 'done'>('play');
  const [moods, setMoods] = useState<Record<Speaker, Mood>>({ pipo: 'idle', tika: 'idle' });
  const [run, setRun] = useState(0);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; stopSpeaking(); }, []);
  const repeatText = personalize(tr(reel.repeat, lang), child);

  // Play the conversation, line by line
  useEffect(() => {
    let cancelled = false;
    setPhase('play');
    (async () => {
      await new Promise((r) => window.setTimeout(r, 700));
      for (const l of reel.lines) {
        if (cancelled || !alive.current) return;
        setSpeaker(l.who);
        setLine(tr(l.text, lang));
        setMoods({ pipo: l.who === 'pipo' ? 'talk' : 'idle', tika: l.who === 'tika' ? 'talk' : 'idle' });
        await speakAsync(tr(l.text, lang), lang, VOICE[l.who]);
        await new Promise((r) => window.setTimeout(r, 350));
      }
      if (cancelled || !alive.current) return;
      setMoods({ pipo: 'happy', tika: 'happy' });
      setSpeaker('pipo');
      const prompt = t('yourTurnSay', lang, { text: repeatText });
      setLine(prompt);
      await speakAsync(prompt, lang, VOICE.pipo);
      if (!cancelled && alive.current) setPhase('repeat');
    })();
    return () => { cancelled = true; stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel.id, run]);

  const repeated = (info: SpeakInfo) => {
    session.add({ ...simpleAttempt('speak', true), coverage: info.score });
    session.finish();
    onRepeated();
    setPhase('done');
    setMoods({ pipo: 'happy', tika: 'happy' });
    setLine(t('reelDone', lang));
    window.setTimeout(() => playSound('unlock'), 300);
    void speakAsync(t('reelDone', lang), lang, VOICE.pipo);
  };

  const textCls = scene.dark ? 'text-white' : 'text-ink';

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden px-4 pt-16 pb-4" style={{ background: scene.sky }}>
      {/* decorative sky */}
      {scene.dark && [12, 30, 70, 85, 55].map((x, i) => (
        <motion.span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-white" style={{ left: `${x}%`, top: `${8 + (i * 7) % 20}%` }}
          animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2 + i * 0.4, repeat: Infinity }} />
      ))}
      <h2 className={`m-0 text-center font-display text-[clamp(1.4rem,6vw,2rem)] font-black ${textCls}`}>{tr(reel.title, lang)}</h2>

      {/* speech bubble of the current speaker */}
      <div className="mt-3 flex min-h-[5.5rem] w-full max-w-md items-start justify-center">
        <AnimatePresence mode="wait">
          {line && (
            <motion.p key={line + speaker}
              initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`clay relative m-0 !rounded-[24px] px-5 py-3 text-center text-[clamp(1.2rem,5.4vw,1.8rem)] leading-tight font-extrabold text-ink ${speaker === 'tika' ? '!bg-[#e0f6ff]' : '!bg-white'}`}
              aria-live="polite">
              {line}
              <span className={`absolute -bottom-[9px] h-4 w-4 rotate-45 rounded-[3px] ${speaker === 'tika' ? 'right-[22%] bg-[#e0f6ff]' : 'left-[22%] bg-white'}`} aria-hidden="true" />
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* the scene: prop + two characters on the ground */}
      <div className="relative flex w-full max-w-md flex-1 items-end justify-center">
        <motion.img src={pictureUrl(reel.prop)} alt="" className="absolute top-[8%] left-1/2 h-[min(22vw,11dvh,6rem)] w-[min(22vw,11dvh,6rem)] -translate-x-1/2"
          animate={{ y: [0, -10, 0], rotate: [0, 4, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} draggable={false} />
        <div className="absolute inset-x-[-20%] bottom-[-6%] h-[38%] rounded-[50%]" style={{ background: scene.ground }} aria-hidden="true" />
        <div className="relative mb-[4%] flex w-full items-end justify-around">
          <motion.div animate={{ scale: speaker === 'pipo' ? 1.08 : 1 }}>
            <Mascot mood={moods.pipo} size={130} palette={PIPO} />
          </motion.div>
          <motion.div animate={{ scale: speaker === 'tika' ? 1.08 : 1 }} style={{ scaleX: -1 }}>
            <Mascot mood={moods.tika} size={120} palette={TIKA} />
          </motion.div>
        </div>
      </div>

      {/* child's turn */}
      <div className="relative flex min-h-[9.5rem] w-full flex-col items-center justify-center">
        {phase === 'repeat' && (
          <SpeakButton
            key={`${reel.id}-${run}`}
            lang={lang}
            expected={repeatText}
            check={child.checkSpeech !== false}
            minScore={0.6}
            skip={[child.name]}
            onDone={repeated}
            onMiss={(info) => { session.add({ ...simpleAttempt('speak', false), coverage: info.score }); setMoods({ pipo: 'encourage', tika: 'encourage' }); }}
          />
        )}
        {phase === 'done' && (
          <>
            <Confetti pieces={30} />
            <button onClick={() => setRun((r) => r + 1)} className="clay-btn is-white text-blue">
              <Icon name="replay" size={22} />{t('watchDemo', lang)}
            </button>
          </>
        )}
        {phase === 'play' && (
          <button onClick={() => { stopSpeaking(); setRun((r) => r + 1); }} aria-label={t('watchDemo', lang)}
            className="clay-btn is-white !h-14 !w-14 !rounded-full !p-0 text-blue opacity-80">
            <Icon name="replay" size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
