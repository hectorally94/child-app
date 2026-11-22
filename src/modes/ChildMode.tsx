import { useEffect, useRef, useState } from 'react';
import { Slate } from '../components/Slate';
import { loadLessons } from '../content';
import { evaluateAttempt } from '../engine/evaluate';
import { speak, stopSpeaking } from '../engine/speech';
import type { FeedbackKey, Lesson, Point } from '../engine/types';
import { t, tr } from '../i18n';
import { newId, type AppData, type AttemptRecord, type Child, type SessionRecord } from '../storage/store';

interface Props {
  child: Child | null;
  update: (fn: (d: AppData) => AppData) => void;
  onParent: () => void;
}

type Screen = { kind: 'welcome' } | { kind: 'lesson'; lesson: Lesson; run: number } | { kind: 'complete'; lesson: Lesson };

export function ChildMode({ child, update, onParent }: Props) {
  const lang = child?.childLang ?? 'en';
  const lessons = loadLessons();
  const today = lessons.find((l) => l.id === child?.todayLessonId) ?? null;
  const [screen, setScreen] = useState<Screen>({ kind: 'welcome' });

  useEffect(() => {
    if (screen.kind === 'welcome') speak(t(today ? 'childWelcome' : 'noActivity', lang), lang);
    return stopSpeaking;
  }, [screen.kind, today, lang]);

  const runRef = useRef(0);
  const startLesson = (lesson: Lesson) => setScreen({ kind: 'lesson', lesson, run: ++runRef.current });

  return (
    <div className="child">
      <button className="parent-lock" onClick={onParent} aria-label={t('parentArea', lang)}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 0 1 6 0v3H9Z" />
        </svg>
      </button>

      {screen.kind === 'welcome' && (
        <main className="child-welcome">
          <p className="child-hello">{t('childWelcome', lang)}</p>
          {today && child ? (
            <button className="today-card" onClick={() => startLesson(today)} aria-label={tr(today.title, lang)}>
              <span className="today-glyph">{today.target}</span>
              <span className="play-disc" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="44" height="44"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
              </span>
            </button>
          ) : (
            <p className="child-empty">{t('noActivity', lang)}</p>
          )}
        </main>
      )}

      {screen.kind === 'lesson' && child && (
        <LessonPlayer
          key={screen.run}
          lesson={screen.lesson}
          child={child}
          update={update}
          onDone={() => setScreen({ kind: 'complete', lesson: screen.lesson })}
        />
      )}

      {screen.kind === 'complete' && (
        <Completion
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
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface PlayerProps {
  lesson: Lesson;
  child: Child;
  update: (fn: (d: AppData) => AppData) => void;
  onDone: () => void;
}

function LessonPlayer({ lesson, child, update, onDone }: PlayerProps) {
  const lang = child.childLang;
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [message, setMessage] = useState<{ key: FeedbackKey; tone: 'good' | 'soft' } | null>(null);
  const [demoDone, setDemoDone] = useState(false);
  const sessionId = useRef(newId());
  const activity = lesson.activities[index];

  // Create the practice session record when the lesson starts (once)
  const created = useRef(false);
  useEffect(() => {
    if (created.current) return;
    created.current = true;
    const session: SessionRecord = {
      id: sessionId.current,
      childId: child.id,
      lessonId: lesson.id,
      startedAt: Date.now(),
      endedAt: null,
      completed: false,
      attempts: [],
    };
    update((d) => ({ ...d, sessions: [...d.sessions, session] }));
  }, [child.id, lesson.id, update]);

  // Speak each step's instruction
  useEffect(() => {
    setMessage(null);
    setAttempts(0);
    setDemoDone(false);
    speak(tr(activity.say, lang), lang);
  }, [index, activity, lang]);

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

  const say = (key: FeedbackKey, tone: 'good' | 'soft') => {
    setMessage({ key, tone });
    speak(tr(lesson.feedback[key], lang), lang);
  };

  const handleAttempt = (drawn: Point[][]) => {
    if (activity.type !== 'trace' && activity.type !== 'free_write') return;
    const metrics = evaluateAttempt(lesson.strokes, drawn, { tolerance: activity.type === 'trace' ? 0.08 : 0.11 });
    if (metrics.outcome === 'no_attempt') {
      speak(tr(activity.say, lang), lang);
      setResetKey((k) => k + 1);
      return;
    }
    const n = attempts + 1;
    setAttempts(n);
    const hint = metrics.outcome !== 'success' && !metrics.startOk && activity.guide !== 'none';
    const record: AttemptRecord = { ...metrics, activity: activity.type, hintShown: hint, at: Date.now() };
    update((d) => ({
      ...d,
      sessions: d.sessions.map((s) =>
        s.id === sessionId.current ? { ...s, endedAt: Date.now(), attempts: [...s.attempts, record] } : s,
      ),
    }));

    if (metrics.outcome === 'success') {
      say('success', 'good');
      window.setTimeout(advance, 1800);
    } else if (n >= activity.maxAttempts) {
      say('moveOn', 'good');
      window.setTimeout(advance, 2000);
    } else {
      say(hint ? 'hintStart' : metrics.outcome === 'uncertain' ? 'uncertain' : 'retry', 'soft');
      window.setTimeout(() => {
        setMessage(null);
        setResetKey((k) => k + 1);
      }, 1800);
    }
  };

  const slateMode = activity.type === 'intro' ? 'show' : activity.type === 'demonstration' ? 'demo' : activity.type === 'trace' ? 'trace' : 'free';
  const guide = activity.type === 'trace' || activity.type === 'free_write' ? activity.guide : 'strong';
  const isPractice = activity.type === 'trace' || activity.type === 'free_write';

  return (
    <main className="player">
      <ol className="step-dots" aria-label={t('steps', lang)}>
        {lesson.activities.map((a, i) => (
          <li key={i} className={i < index ? 'is-done' : i === index ? 'is-now' : ''} aria-current={i === index ? 'step' : undefined}>
            <span className="sr-only">{a.type}</span>
          </li>
        ))}
      </ol>

      <p className="say" aria-live="polite">
        {message ? tr(lesson.feedback[message.key], lang) : tr(activity.say, lang)}
      </p>

      <div className={`slate-wrap ${message?.tone === 'good' ? 'is-glow' : ''}`}>
        <Slate
          strokes={lesson.strokes}
          mode={slateMode}
          guide={guide}
          resetKey={resetKey}
          onAttempt={handleAttempt}
          onDemoEnd={() => setDemoDone(true)}
        />
      </div>

      <div className="player-actions">
        <button className="round-btn" onClick={() => speak(message ? tr(lesson.feedback[message.key], lang) : tr(activity.say, lang), lang)} aria-label="Listen">
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Zm-2.5-8.8v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6Z" /></svg>
        </button>

        {activity.type === 'demonstration' && demoDone && (
          <button className="round-btn" onClick={() => { setDemoDone(false); setResetKey((k) => k + 1); }} aria-label={t('watchDemo', lang)}>
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="currentColor" d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" /></svg>
          </button>
        )}

        {isPractice && (
          <button className="round-btn" onClick={() => { setMessage(null); setResetKey((k) => k + 1); }} aria-label={t('clear', lang)}>
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="currentColor" d="m15.1 3.6 5.3 5.3a2 2 0 0 1 0 2.8l-8 8H19v2H8.4l-4.8-4.8a2 2 0 0 1 0-2.8l8.7-8.5a2 2 0 0 1 2.8 0ZM5 15.6 8.4 19h2.8l2.3-2.3-5.3-5.3L5 15.6Z" /></svg>
          </button>
        )}

        {!isPractice && (activity.type !== 'demonstration' || demoDone) && (
          <button className="go-btn" onClick={advance} aria-label={t('next', lang)}>
            <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
          </button>
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Completion({ lesson, lang, onAgain, onNext, onFinish }: {
  lesson: Lesson; lang: Child['childLang']; onAgain: () => void; onNext: () => void; onFinish: () => void;
}) {
  useEffect(() => {
    speak(tr(lesson.completion, lang), lang);
  }, [lesson, lang]);

  return (
    <main className="complete">
      <div className="stars" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <svg key={i} viewBox="0 0 24 24" style={{ ['--i' as string]: i }}>
            <path fill="currentColor" d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6L12 2Z" />
          </svg>
        ))}
      </div>
      <p className="complete-glyph" aria-hidden="true">{lesson.target}</p>
      <h1 className="complete-title">{tr(lesson.completion, lang)}</h1>
      <div className="complete-actions">
        <button className="choice" onClick={onAgain}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" /></svg>
          {t('tryAgain', lang)}
        </button>
        <button className="choice is-main" onClick={onNext}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
          {t('next', lang)}
        </button>
        <button className="choice" onClick={onFinish}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5Z" /></svg>
          {t('finish', lang)}
        </button>
      </div>
    </main>
  );
}
