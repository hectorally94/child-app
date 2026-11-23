import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Confetti } from '../components/Decor';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { SpeakButton } from '../components/SpeakButton';
import { loadCatalog, pickSource, type FamilyReel, type FeedItem, type ReelVideo } from '../content/reels';
import { addSeconds, buildFeed, markSeen, nextBreakSeconds, networkAllowed, remainingToday, reelSettings } from '../engine/reelPolicy';
import { playSound, speak, speakAsync, stopSpeaking } from '../engine/speech';
import { save, savedObjectUrl, savedUrls } from '../pwa/reelCache';
import { t, tr } from '../i18n';
import { getFamilyVideo } from '../storage/familyDb';
import { newId, type AppData, type Child } from '../storage/store';
import { simpleAttempt } from './WordsPlayer';

interface Props {
  child: Child;
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  onHome: () => void;
  /** Go back to learning (the "Petits mots" sessions). */
  onLearn: () => void;
}

type Ending = null | 'break' | 'day' | 'feed';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
const itemTitle = (it: FeedItem, lang: Child['childLang']) => (it.kind === 'family' ? it.title : tr(it.title, lang));

/**
 * "Pause vidéos": a vertical, scrolling feed of short clips for when the child is tired of exercises.
 * Curated and ad-free: no likes, comments, follows, links or outside recommendations. A break has a time limit
 * (and a daily maximum) set by the parent; clips are saved on the phone so the next break works offline.
 */
export function ReelFeed({ child, data, update, onHome, onLearn }: Props) {
  const lang = child.childLang;
  const settings = reelSettings(data);
  const limit = useRef(nextBreakSeconds(data, child.id)).current; // seconds allowed in this break
  const dayLeftAtStart = useRef(remainingToday(data, child.id)).current; // seconds left in the day when it began
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [internet, setInternet] = useState(false);
  const [active, setActive] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState<Ending>(limit <= 0 ? 'day' : null);
  const scroller = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const watched = useRef(0);
  const flushed = useRef(0);
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  // 1. what to show: our clips (fresh list when online) + the family's videos
  useEffect(() => {
    let off = false;
    (async () => {
      const [catalog, savedSet] = await Promise.all([loadCatalog(), savedUrls()]);
      const net = networkAllowed(settings.data);
      const family: FamilyReel[] = (data.family ?? []).map((f) => ({ kind: 'family', ...f }));
      const feed = buildFeed(catalog, family, savedSet, net, data.reelLog?.seen ?? {});
      if (off) return;
      setSaved(savedSet);
      setInternet(net);
      setItems(feed);
    })();
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. the clock of the break: counts only while the screen is visible and the feed is playing
  useEffect(() => {
    if (!items?.length || ending) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setElapsed((e) => e + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [items, ending]);

  const flush = useCallback(() => {
    const n = elapsedRef.current - flushed.current;
    if (n > 0) {
      flushed.current = elapsedRef.current;
      update((d) => addSeconds(d, child.id, n));
    }
  }, [update, child.id]);

  const finish = useCallback((why: Exclude<Ending, null>) => {
    flush();
    stopSpeaking();
    setEnding(why);
  }, [flush]);

  useEffect(() => {
    if (elapsed > 0 && elapsed - flushed.current >= 5) flush();
    if (!ending && items?.length && elapsed >= limit) {
      finish(dayLeftAtStart - elapsed <= 0 ? 'day' : 'break');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);
  useEffect(() => () => { flush(); stopSpeaking(); }, [flush]);

  // 3. say goodbye
  useEffect(() => {
    if (!ending) return;
    playSound('unlock');
    const text = t(ending === 'day' ? 'dayDone' : ending === 'feed' ? 'feedDone' : 'pauseDone', lang);
    const id = window.setTimeout(() => void speakAsync(text, lang), 500);
    return () => window.clearTimeout(id);
  }, [ending, lang]);

  // 4. which slide is on screen
  useEffect(() => {
    const root = scroller.current;
    if (!root || !items?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting && e.intersectionRatio >= 0.6) setActive(slides.current.indexOf(e.target as HTMLDivElement)); }),
      { root, threshold: [0.6] },
    );
    slides.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [items]);

  const goTo = (i: number) => {
    const root = scroller.current;
    if (root) root.scrollTo({ top: i * root.clientHeight, behavior: 'smooth' });
  };

  // 5. save the next clips for later (when the internet may be used)
  useEffect(() => {
    if (!items || !internet || ending) return;
    let cancelled = false;
    (async () => {
      for (let k = active; k <= Math.min(items.length - 1, active + 3); k++) {
        const it = items[k];
        if (it.kind !== 'video') continue;
        const url = pickSource(it);
        if (saved.has(url)) continue;
        if (await save(url) && !cancelled) setSaved((s) => new Set(s).add(url));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, items, internet, ending]);

  const onEnded = (it: FeedItem) => {
    watched.current += 1;
    update((d) => markSeen(d, it.id));
  };

  const onNext = (i: number) => {
    if (!items) return;
    if (i + 1 < items.length) goTo(i + 1);
    else finish('feed');
  };

  const logSpoke = (it: FeedItem) =>
    update((d) => ({
      ...d,
      sessions: [...d.sessions, {
        id: newId(), childId: child.id, lessonId: `reel:${it.id}`, startedAt: Date.now(), endedAt: Date.now(), completed: true,
        attempts: [{ ...simpleAttempt('speak', true), item: it.id }],
      }],
    }));

  const left = Math.max(0, limit - elapsed);

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex min-h-0 w-full flex-1 flex-col bg-[#14112a]">
      {/* the feed: one clip per screen, native scroll-snap (swipe up for the next one) */}
      <div
        ref={scroller}
        className="mx-auto min-h-0 w-full max-w-[min(100%,calc(100dvh*9/16))] flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={t('pauseVideo', lang)}
      >
        {(items ?? []).map((it, i) => (
          <div key={it.id} ref={(el) => { slides.current[i] = el; }} className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden">
            <Slide
              item={it}
              lang={lang}
              active={i === active && !ending}
              near={Math.abs(i - active) <= 1}
              internet={internet}
              check={child.checkSpeech !== false}
              onEnded={() => onEnded(it)}
              onNext={() => onNext(i)}
              onSpoke={() => logSpoke(it)}
            />
          </div>
        ))}
        {items && items.length === 0 && <Empty lang={lang} onHome={onHome} />}
        {!items && <div className="grid h-full place-items-center"><Mascot mood="talk" size={110} /></div>}
      </div>

      {/* top bar: home, and how much of the break is left */}
      {!ending && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-20 flex items-center justify-between px-3">
          <button onClick={() => { flush(); stopSpeaking(); onHome(); }} aria-label={t('home', lang)}
            className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full bg-white/85 text-ink-soft shadow-md active:scale-90">
            <Icon name="home" size={22} />
          </button>
          {items && items.length > 0 && limit > 0 && (
            <div className="pointer-events-none flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-sm font-black text-white backdrop-blur" role="timer" aria-label={t('timeLeft', lang, { time: fmt(left) })}>
              <Icon name="clock" size={16} />{fmt(left)}
              <span className="block h-1.5 w-14 overflow-hidden rounded-full bg-white/30"><span className="block h-full rounded-full bg-sun" style={{ width: `${(left / limit) * 100}%` }} /></span>
            </div>
          )}
          <span className="w-12" />
        </div>
      )}

      <AnimatePresence>
        {ending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-30 grid place-items-center bg-canvas/95 px-6 backdrop-blur-sm">
            <Confetti pieces={26} />
            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
              <Mascot mood="happy" size={120} />
              <h1 className="m-0 font-display text-3xl font-black text-pink">{t(ending === 'day' ? 'dayDoneTitle' : 'pauseDone', lang)}</h1>
              <p className="m-0 text-lg font-bold text-ink-soft">
                {ending === 'day' ? t('dayDone', lang) : ending === 'feed' ? t('feedDone', lang) : t('watchedCount', lang, { n: watched.current })}
              </p>
              <button onClick={() => { stopSpeaking(); onLearn(); }} className="clay-btn is-sun mt-2 !min-h-14 !px-7 text-lg"><Icon name="play" size={22} />{t('doSession', lang)}</button>
              <button onClick={() => { stopSpeaking(); onHome(); }} className="clay-btn is-white !min-h-12 text-base"><Icon name="home" size={20} />{t('home', lang)}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

function Empty({ lang, onHome }: { lang: Child['childLang']; onHome: () => void }) {
  return (
    <div className="grid h-full place-items-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center text-white">
        <Mascot mood="encourage" size={110} />
        <p className="m-0 text-xl font-black">{t('reelsEmpty', lang)}</p>
        <button onClick={onHome} className="clay-btn is-white text-base"><Icon name="home" size={20} />{t('home', lang)}</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ one clip */

interface SlideProps {
  item: FeedItem;
  lang: Child['childLang'];
  active: boolean;
  near: boolean;
  internet: boolean;
  check: boolean;
  onEnded: () => void;
  onNext: () => void;
  onSpoke: () => void;
}

function Slide({ item, lang, active, near, internet, check, onEnded, onNext, onSpoke }: SlideProps) {
  const video = useRef<HTMLVideoElement>(null);
  const cue = useRef(0);
  const [src, setSrc] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [ended, setEnded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mic, setMic] = useState(false);
  const [praised, setPraised] = useState(false);
  const cues = item.kind === 'video' ? item.cues : [];
  const poster = item.kind === 'video' ? item.poster : undefined;
  const repeat = item.kind === 'video' && item.repeat ? tr(item.repeat, lang) : null;

  // find the file to play: saved on the phone, or (when allowed) streamed
  useEffect(() => {
    if (!near) return;
    let off = false;
    let made: string | null = null;
    (async () => {
      if (item.kind === 'family') {
        const blob = await getFamilyVideo(item.id);
        if (blob && !off) { made = URL.createObjectURL(blob); setSrc(made); }
        return;
      }
      const url = pickSource(item as ReelVideo);
      const local = await savedObjectUrl(url);
      if (off) { if (local) URL.revokeObjectURL(local); return; }
      if (local) { made = local; setSrc(local); } else setSrc(internet ? url : null);
    })();
    return () => { off = true; if (made) URL.revokeObjectURL(made); setSrc(null); };
  }, [near, item, internet]);

  const restart = useCallback(() => {
    const v = video.current;
    if (!v) return;
    cue.current = 0;
    setEnded(false);
    setPaused(false);
    setMic(false);
    setPraised(false);
    v.currentTime = 0;
    void v.play().catch(() => setPaused(true));
  }, []);

  // play only the clip that is on screen
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (active && src) {
      if (item.kind === 'family') setCaption(item.title);
      restart();
    } else {
      v.pause();
      stopSpeaking();
      setCaption('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, src]);

  // after a clip: wait a little, then go to the next one (unless the child is saying the word)
  useEffect(() => {
    if (!ended || !active || mic) return;
    const id = window.setTimeout(onNext, repeat && !praised ? 14000 : 7000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, active, mic, praised]);

  const onTime = () => {
    const v = video.current;
    if (!v || !active) return;
    while (cue.current < cues.length && cues[cue.current].t <= v.currentTime) {
      const c = cues[cue.current++];
      if (v.currentTime - c.t < 1.5) {
        setCaption(tr(c.show, lang));
        speak(tr(c.say, lang), lang);
      }
    }
  };

  const toggle = () => {
    const v = video.current;
    if (!v || ended || mic) return;
    if (v.paused) { void v.play(); setPaused(false); } else { v.pause(); stopSpeaking(); setPaused(true); }
  };

  return (
    <div className="relative h-full w-full bg-[#14112a]">
      {item.kind === 'video' && poster && !src && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
      {src && (
        <video
          ref={video}
          src={src}
          poster={poster}
          playsInline
          muted={item.kind === 'video' && !item.audio}
          preload={active ? 'auto' : 'metadata'}
          className={`absolute inset-0 h-full w-full ${item.kind === 'family' ? 'object-contain' : 'object-cover'}`}
          onTimeUpdate={onTime}
          onEnded={() => { setEnded(true); onEnded(); }}
          onClick={toggle}
        />
      )}
      {!src && active && item.kind === 'video' && !internet && !poster && <div className="absolute inset-0 grid place-items-center text-white"><Mascot mood="encourage" size={100} /></div>}

      {/* title */}
      {active && (
        <p className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+4.6rem)] m-0 px-6 text-center text-sm font-black text-white/90 [text-shadow:0_1px_4px_rgb(0_0_0/0.5)]">
          {itemTitle(item, lang)}
        </p>
      )}

      {/* caption + Pipo's voice */}
      <AnimatePresence mode="wait">
        {active && caption && !mic && (
          <motion.p key={caption} initial={{ opacity: 0, y: 14, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-5 bottom-[17%] m-0 mx-auto w-fit max-w-[88%] rounded-[26px] bg-white/95 px-5 py-2.5 text-center font-display text-[clamp(1.3rem,5.6vw,2rem)] leading-tight font-black text-ink shadow-xl">
            {caption}
          </motion.p>
        )}
      </AnimatePresence>

      {paused && !ended && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-black/40 text-white"><Icon name="play" size={48} /></span>
        </div>
      )}

      {/* the clip is over: again, say it, or swipe up */}
      <AnimatePresence>
        {ended && active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-4 pt-16 pb-[calc(env(safe-area-inset-bottom)+1.2rem)]">
            {mic && repeat ? (
              <div className="clay flex w-full max-w-sm flex-col items-center gap-1 !rounded-[28px] bg-white p-3">
                <p className="m-0 text-center font-display text-xl font-black text-ink">{repeat}</p>
                <SpeakButton lang={lang} expected={repeat} check={check} minScore={0.6}
                  onDone={() => { setMic(false); setPraised(true); onSpoke(); playSound('success'); }} />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={restart} aria-label={t('watchDemo', lang)} className="clay-btn is-white !h-14 !w-14 !rounded-full !p-0 text-blue"><Icon name="replay" size={26} /></button>
                {repeat && (
                  <button onClick={() => { stopSpeaking(); setMic(true); }} className="clay-btn is-pink !min-h-14 !px-5 text-lg">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>
                    {t('sayIt', lang)}
                  </button>
                )}
                <button onClick={onNext} aria-label={t('nextReel', lang)} className="clay-btn is-sun !h-14 !w-14 !rounded-full !p-0">
                  <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 1.1, repeat: Infinity }}><Icon name="back" size={26} className="-rotate-90" /></motion.span>
                </button>
              </div>
            )}
            {!mic && <p className="m-0 text-sm font-bold text-white/85">{t('swipeUp', lang)}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

