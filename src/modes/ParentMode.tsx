import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { AVATAR_COLORS, Avatar } from '../components/Avatar';
import { Icon, type IconName } from '../components/Icon';
import { InstallCard } from '../components/InstallCard';
import { PinPad } from '../components/PinPad';
import { learningPath, masteredIds } from '../engine/progress';
import { loadReels, loadWordSets, talkKey, wordsKey } from '../content/speak';
import { hashPin } from '../storage/pin';
import { Slate } from '../components/Slate';
import { loadLessons } from '../content';
import { summarize, type LessonSummary } from '../engine/summary';
import { LANGS, type Lang, type Lesson } from '../engine/types';
import { LANG_NAMES, t, tr } from '../i18n';
import { newId, type AppData, type Child } from '../storage/store';

type Tab = 'dashboard' | 'lessons' | 'settings';

interface Props {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  onChildMode: () => void;
}

const spring = { type: 'spring', stiffness: 300, damping: 26 } as const;
const page = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};
const list = { animate: { transition: { staggerChildren: 0.05 } } };
const item = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0, transition: spring } };

export function ParentMode({ data, update, onChildMode }: Props) {
  const lang = data.parentLang;
  const child = data.children.find((c) => c.id === data.activeChildId) ?? null;
  const [tab, setTab] = useState<Tab>(child ? 'dashboard' : 'settings');
  const [preview, setPreview] = useState<Lesson | null>(null);

  // Open the profile editor and put the cursor in the first-name field.
  const openProfile = () => {
    setTab('settings');
    setPreview(null);
    window.setTimeout(() => {
      const input = document.getElementById('profile-name') as HTMLInputElement | null;
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus({ preventScroll: true });
      input?.select();
    }, 350);
  };

  const setChild = (patch: Partial<Child>) =>
    update((d) => ({ ...d, children: d.children.map((c) => (c.id === d.activeChildId ? { ...c, ...patch } : c)) }));

  const tabs: { k: Tab; icon: IconName }[] = [
    { k: 'dashboard', icon: 'chart' },
    { k: 'lessons', icon: 'book' },
    { k: 'settings', icon: 'gear' },
  ];

  return (
    <div className="flex min-h-full flex-col bg-canvas font-body text-ink">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {child ? (
            <button onClick={openProfile} aria-label={`${t('editProfile', lang)} · ${child.name}`}
              className="-ml-1.5 flex min-w-0 flex-1 items-center gap-3 rounded-[22px] p-1.5 text-left transition hover:bg-white/70 active:scale-[0.98]">
              <span className="relative shrink-0">
                <Avatar child={child} size={44} />
                <span className="absolute -right-1 -bottom-1 grid h-6 w-6 place-items-center rounded-full border-2 border-canvas bg-blue text-white" aria-hidden="true">
                  <Icon name="pencil" size={12} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-lg leading-tight font-black">{child.name}</span>
                <span className="block text-sm text-ink-soft">{t('editProfile', lang)}</span>
              </span>
            </button>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate font-display text-lg leading-tight font-black">{t('parentArea', lang)}</p>
            </div>
          )}
          <button className="clay-btn is-sun !min-h-12 !px-4 text-base" onClick={onChildMode} disabled={!child}>
            <span className="hidden sm:inline">{t('startChildMode', lang).replace(' ▶', '')}</span>
            <span className="sm:hidden">{lang === 'fr' ? 'Enfant' : 'Child'}</span>
            <Icon name="play" size={18} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-32">
        <AnimatePresence mode="wait">
          <motion.div key={tab + (preview?.id ?? '')} {...page}>
            {tab === 'dashboard' && (
              <Dashboard data={data} child={child} lang={lang} onOpen={(l) => { setTab('lessons'); setPreview(l); }} onGoLessons={() => setTab('lessons')}
                onSelectChild={(id) => update((d) => ({ ...d, activeChildId: id }))}
                onGoSettings={() => {
                  setTab('settings');
                  window.setTimeout(() => document.getElementById('parent-code')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
                }} />
            )}
            {tab === 'lessons' && (preview
              ? <Preview lesson={preview} lang={lang} child={child} onBack={() => setPreview(null)}
                  onAssign={() => setChild({ todayLessonId: preview.id })} onChildMode={onChildMode} />
              : <Catalogue lang={lang} child={child} onOpen={setPreview} />)}
            {tab === 'settings' && <Settings data={data} update={update} onEdit={openProfile} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* bottom navigation */}
      <nav aria-label={t('parentArea', lang)} className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="clay mx-auto flex max-w-md items-center justify-around !rounded-[26px] p-1.5">
          {tabs.map(({ k, icon }) => {
            const on = tab === k;
            return (
              <button
                key={k}
                onClick={() => { setTab(k); setPreview(null); }}
                aria-current={on ? 'page' : undefined}
                className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] font-display text-sm font-extrabold transition-colors ${on ? 'text-blue' : 'text-ink-soft'}`}
              >
                {on && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-[20px] bg-blue-soft" transition={spring} />}
                <span className="relative"><Icon name={icon} size={22} /></span>
                <span className="relative">{t(k, lang)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="m-0 mb-3 font-display text-xl font-black text-ink">{children}</h2>;
}

function Glyph({ lesson, size = 'md' }: { lesson: Lesson; size?: 'md' | 'lg' }) {
  const two = lesson.target.length > 1;
  const s = size === 'lg' ? `h-24 w-24 rounded-[28px] ${two ? 'text-5xl' : 'text-6xl'}` : `h-16 w-16 rounded-[20px] ${two ? 'text-3xl' : 'text-4xl'}`;
  return (
    <span className={`grid shrink-0 place-items-center bg-gradient-to-br from-blue to-violet font-display font-black text-white shadow-[inset_0_-4px_0_rgb(0_0_0/0.15),inset_0_3px_6px_rgb(255_255_255/0.35),0_8px_16px_-6px_rgb(37_99_235/0.6)] ${s}`} aria-hidden="true">
      {lesson.target}
    </span>
  );
}

const STATUS: Record<LessonSummary['status'], { icon: IconName; cls: string; key: 'mastered' | 'needsPractice' | 'inProgress' }> = {
  mastered: { icon: 'check', cls: 'bg-mint-soft text-mint-deep', key: 'mastered' },
  needsPractice: { icon: 'hand', cls: 'bg-sun-soft text-[#92400e]', key: 'needsPractice' },
  inProgress: { icon: 'clock', cls: 'bg-violet-soft text-violet', key: 'inProgress' },
};

function Dashboard({ data, child, lang, onOpen, onGoLessons, onSelectChild, onGoSettings }: {
  data: AppData; child: Child | null; lang: Lang; onOpen: (l: Lesson) => void; onGoLessons: () => void;
  onSelectChild: (id: string) => void; onGoSettings: () => void;
}) {
  if (!child) return <p className="clay p-5 text-lg">{t('noChild', lang)}</p>;
  const sessions = data.sessions.filter((s) => s.childId === child.id);
  const rows = loadLessons()
    .map((l) => ({ lesson: l, sum: summarize(l.id, sessions, lang) }))
    .filter((r): r is { lesson: Lesson; sum: LessonSummary } => r.sum !== null)
    .sort((a, b) => b.sum.lastAt - a.sum.lastAt);
  const today = loadLessons().find((l) => l.id === child.todayLessonId);
  const minutes = rows.reduce((a, r) => a + r.sum.minutes, 0);

  return (
    <motion.div variants={list} initial="initial" animate="animate" className="flex flex-col gap-7">
      <InstallCard lang={lang} />
      {!data.parentPinHash && (
        <motion.div variants={item} className="clay flex flex-wrap items-center gap-3 bg-violet-soft! p-4">
          <Icon name="lock" size={24} className="shrink-0 text-violet" />
          <p className="m-0 min-w-[14ch] flex-1 text-ink">{t('codeTip', lang)}</p>
          <button className="clay-btn !min-h-11 text-base" onClick={onGoSettings}>{t('createCode', lang)}</button>
        </motion.div>
      )}
      <motion.section variants={item}>
        <H2>{t('childrenProgress', lang)}</H2>
        <ChildrenProgress data={data} activeId={child.id} lang={lang} onSelect={onSelectChild} />
      </motion.section>
      <motion.section variants={item}>
        <H2>{t('todayActivity', lang)}</H2>
        {today ? (
          <button onClick={() => onOpen(today)} className="clay flex w-full items-center gap-4 p-4 text-left transition active:scale-[0.99]">
            <Glyph lesson={today} />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-black">{tr(today.title, lang)}</span>
              <span className="block text-ink-soft">{tr(today.objective, lang)}</span>
            </span>
            <Icon name="next" size={22} className="shrink-0 text-blue" />
          </button>
        ) : (
          <div className="clay flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="m-0 text-ink-soft">{t('noActivityParent', lang)}</p>
            <button className="clay-btn !min-h-11 text-base" onClick={onGoLessons}>{t('lessons', lang)}</button>
          </div>
        )}
      </motion.section>

      {rows.length > 0 && (
        <motion.section variants={item} className="flex flex-wrap gap-2" aria-label={t('progress', lang)}>
          <Chip icon="book" text={`${rows.length} · ${t('lessonsDone', lang)}`} />
          <Chip icon="clock" text={`${minutes} ${t('minutes', lang)} · ${t('totalTime', lang)}`} />
        </motion.section>
      )}

      <motion.section variants={item}>
        <H2>{t('progress', lang)}</H2>
        {rows.length === 0 && <p className="clay m-0 p-5 text-ink-soft">{t('noProgress', lang)}</p>}
        <motion.ul variants={list} initial="initial" animate="animate" className="m-0 flex list-none flex-col gap-3 p-0">
          {rows.map(({ lesson, sum }) => {
            const st = STATUS[sum.status];
            return (
              <motion.li variants={item} key={lesson.id} className="clay p-4">
                <div className="flex items-center gap-3">
                  <Glyph lesson={lesson} />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 font-display text-lg font-black">{tr(lesson.title, lang)}</p>
                    <p className="m-0 text-sm text-ink-soft">
                      {t('successCount', lang, { ok: sum.successes, ko: sum.failures })} · {sum.minutes} {t('minutes', lang)} · {new Date(sum.lastAt).toLocaleDateString(lang)}
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${st.cls}`}>
                    <Icon name={st.icon} size={16} />{t(st.key, lang)}
                  </span>
                </div>
                {sum.notes.length > 0 && (
                  <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 rounded-[18px] bg-canvas p-3">
                    {sum.notes.map((n) => (
                      <li key={n} className="flex gap-2 text-[0.98rem] leading-snug">
                        <Icon name="sparkle" size={16} className="mt-0.5 shrink-0 text-violet" />{n}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.li>
            );
          })}
        </motion.ul>
      </motion.section>
    </motion.div>
  );
}

function Chip({ icon, text }: { icon: IconName; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-ink-soft shadow-[0_4px_12px_-6px_rgb(76_56_140/0.35)]">
      <Icon name={icon} size={16} className="text-blue" />{text}
    </span>
  );
}

function Catalogue({ lang, child, onOpen }: { lang: Lang; child: Child | null; onOpen: (l: Lesson) => void }) {
  const lessons = loadLessons();
  const areas = [...new Set(lessons.map((l) => l.group))];
  const areaName: Record<string, { en: string; fr: string }> = {
    numbers: { en: 'Writing numbers', fr: 'Écrire les chiffres et les nombres' },
    letters: { en: 'Writing letters', fr: 'Écrire les lettres' },
  };
  return (
    <div className="flex flex-col gap-7">
      {areas.map((area) => (
        <section key={area}>
          <H2>{tr(areaName[area] ?? { en: area, fr: area }, lang)}</H2>
          <motion.ul variants={list} initial="initial" animate="animate" className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
            {lessons.filter((l) => l.group === area).map((l) => (
              <motion.li variants={item} key={l.id}>
                <button onClick={() => onOpen(l)} className="clay flex h-full w-full items-center gap-4 p-4 text-left transition active:scale-[0.98]">
                  <Glyph lesson={l} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-black">{tr(l.title, lang)}</span>
                    <span className="block text-sm text-ink-soft">{tr(l.objective, lang)}</span>
                    {child?.todayLessonId === l.id && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-sun-soft px-2.5 py-0.5 text-xs font-bold text-[#92400e]">
                        <Icon name="sparkle" size={12} />{t('isToday', lang).replace(' ✓', '')}
                      </span>
                    )}
                  </span>
                </button>
              </motion.li>
            ))}
          </motion.ul>
        </section>
      ))}
    </div>
  );
}

function Preview({ lesson, lang, child, onBack, onAssign, onChildMode }: {
  lesson: Lesson; lang: Lang; child: Child | null; onBack: () => void; onAssign: () => void; onChildMode: () => void;
}) {
  const isToday = child?.todayLessonId === lesson.id;
  const [demoKey, setDemoKey] = useState(0);
  return (
    <article className="flex flex-col gap-5">
      <button className="clay-btn is-ghost !min-h-11 self-start !px-0" onClick={onBack}>
        <Icon name="back" size={20} />{t('lessons', lang)}
      </button>

      <div className="flex items-center gap-4">
        <Glyph lesson={lesson} size="lg" />
        <div>
          <h2 className="m-0 font-display text-3xl font-black">{tr(lesson.title, lang)}</h2>
          <p className="m-0 mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-mint-deep">
            <Icon name="offline" size={16} />{t('availableOffline', lang)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative mx-auto w-full max-w-[min(100%,60dvh)]">
          <Slate strokes={lesson.strokes} midline={lesson.guideLines === 'midline'} mode="demo" guide="strong" resetKey={demoKey} />
          <button onClick={() => setDemoKey((k) => k + 1)} aria-label={t('watchDemo', lang)}
            className="clay-btn is-white absolute right-3 bottom-3 !h-12 !w-12 !rounded-full !p-0 text-blue">
            <Icon name="replay" size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <section className="clay p-5">
            <h3 className="m-0 font-display text-lg font-black text-blue">{t('objective', lang)}</h3>
            <p className="m-0 mt-1 leading-relaxed">{tr(lesson.objective, lang)}</p>
          </section>
          <section className="clay p-5">
            <h3 className="m-0 font-display text-lg font-black text-blue">{t('steps', lang)}</h3>
            <ol className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
              {lesson.activities.map((a, i) => (
                <li key={i} className="flex gap-3 leading-snug">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-soft font-display text-sm font-black text-blue">{i + 1}</span>
                  <span className="pt-0.5">{tr(a.say, lang)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <section className="clay bg-sun-soft! p-5">
        <h3 className="m-0 flex items-center gap-2 font-display text-lg font-black text-[#92400e]"><Icon name="hand" size={20} />{t('howToHelp', lang)}</h3>
        <p className="m-0 mt-1 max-w-[62ch] leading-relaxed">{tr(lesson.parentGuide, lang)}</p>
      </section>

      {!child && <p className="m-0 text-ink-soft">{t('noChild', lang)}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {isToday ? (
          <>
            <span className="inline-flex min-h-12 items-center gap-2 rounded-full bg-mint-soft px-4 font-display font-extrabold text-mint-deep">
              <Icon name="check" size={20} />{t('isToday', lang).replace(' ✓', '')}
            </span>
            <button className="clay-btn is-sun" onClick={onChildMode}>
              {t('startChildMode', lang).replace(' ▶', '')}<Icon name="play" size={18} />
            </button>
          </>
        ) : (
          <button className="clay-btn" onClick={onAssign} disabled={!child}>
            <Icon name="sparkle" size={20} />{t('setToday', lang)}
          </button>
        )}
      </div>
    </article>
  );
}

function Settings({ data, update, onEdit }: { data: AppData; update: (fn: (d: AppData) => AppData) => void; onEdit: () => void }) {
  const lang = data.parentLang;
  const [name, setName] = useState('');
  const child = data.children.find((c) => c.id === data.activeChildId);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const c: Child = { id: newId(), name: clean, childLang: lang, todayLessonId: loadLessons()[0]?.id ?? null, avatar: data.children.length % AVATAR_COLORS.length };
    update((d) => ({ ...d, children: [...d.children, c], activeChildId: c.id }));
    setName('');
  };

  const remove = (id: string) => {
    if (!window.confirm(t('confirmDelete', lang))) return;
    update((d) => ({
      ...d,
      children: d.children.filter((c) => c.id !== id),
      sessions: d.sessions.filter((s) => s.childId !== id),
      activeChildId: d.activeChildId === id ? d.children.find((c) => c.id !== id)?.id ?? null : d.activeChildId,
    }));
  };

  return (
    <div className="flex flex-col gap-7">
      {child && <ProfileEditor key={child.id} child={child} lang={lang} update={update} />}

      <section>
        <H2>{t('children', lang)}</H2>
        <div className="clay p-4">
          {data.children.length > 0 && (
            <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0">
              <AnimatePresence initial={false}>
                {data.children.map((c) => {
                  const active = c.id === data.activeChildId;
                  return (
                    <motion.li key={c.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: -30 }}
                      className={`flex flex-wrap items-center gap-3 rounded-[20px] p-2.5 ${active ? 'bg-blue-soft' : 'bg-canvas'}`}>
                      <Avatar child={c} size={44} />
                      <strong className="min-w-0 flex-1 truncate font-display text-lg">{c.name}</strong>
                      {active
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-bold text-blue"><Icon name="check" size={14} />{t('active', lang)}</span>
                        : <button className="clay-btn is-white !min-h-11 !px-4 text-sm" onClick={() => update((d) => ({ ...d, activeChildId: c.id }))}>{t('select', lang)}</button>}
                      <button className="grid h-11 w-11 place-items-center rounded-full text-blue transition hover:bg-white active:scale-90"
                        onClick={() => { update((d) => ({ ...d, activeChildId: c.id })); onEdit(); }} aria-label={`${t('edit', lang)} ${c.name}`}>
                        <Icon name="pencil" size={20} />
                      </button>
                      <button className="grid h-11 w-11 place-items-center rounded-full text-[#b91c1c] transition hover:bg-white active:scale-90" onClick={() => remove(c.id)} aria-label={`${t('delete', lang)} ${c.name}`}>
                        <Icon name="trash" size={20} />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
          <form onSubmit={add}>
            <label htmlFor="child-name" className="mb-2 block font-bold">{t('childName', lang)}</label>
            <div className="flex flex-wrap gap-3">
              <input id="child-name" className="clay-input min-w-[12ch] flex-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="off" />
              <button className="clay-btn" type="submit" disabled={!name.trim()}><Icon name="plus" size={20} />{t('addChild', lang)}</button>
            </div>
          </form>
        </div>
      </section>

      <ParentCodeSection data={data} update={update} />

      <section>
        <H2>{t('settings', lang)}</H2>
        <div className="clay flex flex-col gap-5 p-5">
          <LangSwitch label={t('parentLanguage', lang)} value={lang} onChange={(v) => update((d) => ({ ...d, parentLang: v }))} />
          {child && (
            <LangSwitch label={`${t('childLanguage', lang)} · ${child.name}`} value={child.childLang}
              onChange={(v) => update((d) => ({ ...d, children: d.children.map((c) => (c.id === child.id ? { ...c, childLang: v } : c)) }))} />
          )}
          {child && (
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="peer sr-only" checked={child.checkSpeech !== false}
                onChange={(e) => update((d) => ({ ...d, children: d.children.map((c) => (c.id === child.id ? { ...c, checkSpeech: e.target.checked } : c)) }))} />
              <span className="relative mt-0.5 h-8 w-14 shrink-0 rounded-full bg-[#ddd6ee] transition-colors peer-checked:bg-blue peer-focus-visible:outline-4 peer-focus-visible:outline-violet after:absolute after:top-1 after:left-1 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-6" aria-hidden="true" />
              <span>
                <span className="block font-bold">{t('checkSpeech', lang)} · {child.name}</span>
                <span className="block text-sm text-ink-soft">{t('checkSpeechHelp', lang)}</span>
              </span>
            </label>
          )}
          {child && (
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="peer sr-only" checked={!!child.unlockAll}
                onChange={(e) => update((d) => ({ ...d, children: d.children.map((c) => (c.id === child.id ? { ...c, unlockAll: e.target.checked } : c)) }))} />
              <span className="relative mt-0.5 h-8 w-14 shrink-0 rounded-full bg-[#ddd6ee] transition-colors peer-checked:bg-blue peer-focus-visible:outline-4 peer-focus-visible:outline-violet after:absolute after:top-1 after:left-1 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-6" aria-hidden="true" />
              <span>
                <span className="block font-bold">{t('unlockAll', lang)} · {child.name}</span>
                <span className="block text-sm text-ink-soft">{t('unlockAllHelp', lang)}</span>
              </span>
            </label>
          )}
          <p className="m-0 flex gap-2 rounded-[18px] bg-mint-soft p-3 text-sm text-mint-deep">
            <Icon name="lock" size={18} className="shrink-0" />{t('privacyNote', lang)} {t('micPrivacy', lang)}
          </p>
          <p className="m-0 text-xs text-ink-soft">{t('picturesCredit', lang)}</p>
        </div>
      </section>
    </div>
  );
}

function LangSwitch({ label, value, onChange }: { label: string; value: Lang; onChange: (v: Lang) => void }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 p-0 font-bold">{label}</legend>
      <div className="inline-flex rounded-full bg-canvas p-1 shadow-[inset_2px_3px_6px_rgb(43_39_64/0.08)]" role="radiogroup">
        {LANGS.map((l) => {
          const on = value === l;
          return (
            <button key={l} type="button" role="radio" aria-checked={on} onClick={() => onChange(l)}
              className={`relative min-h-11 rounded-full px-5 font-display font-extrabold transition-colors ${on ? 'text-white' : 'text-ink-soft'}`}>
              {on && <motion.span layoutId={`lang-${label}`} className="absolute inset-0 rounded-full bg-blue shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)]" transition={spring} />}
              <span className="relative">{LANG_NAMES[l]}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ProfileEditor({ child, lang, update }: { child: Child; lang: Lang; update: (fn: (d: AppData) => AppData) => void }) {
  const [name, setName] = useState(child.name);
  const [saved, setSaved] = useState(false);
  const patch = (p: Partial<Child>) =>
    update((d) => ({ ...d, children: d.children.map((c) => (c.id === child.id ? { ...c, ...p } : c)) }));
  const saveName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    patch({ name: clean });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };
  return (
    <section>
      <H2>{t('childProfile', lang)}</H2>
      <div className="clay flex flex-col gap-5 p-5">
        <div className="flex items-center gap-4">
          <motion.div key={`${child.avatar}-${child.name}`} initial={{ scale: 0.7, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
            <Avatar child={{ ...child, name: name || child.name }} size={72} ring />
          </motion.div>
          <form onSubmit={saveName} className="min-w-0 flex-1">
            <label htmlFor="profile-name" className="mb-1.5 block font-bold">{t('firstName', lang)}</label>
            <div className="flex flex-wrap gap-2">
              <input id="profile-name" className="clay-input min-w-[10ch] flex-1" value={name} maxLength={30} autoComplete="off" onChange={(e) => setName(e.target.value)} />
              <button type="submit" className={`clay-btn ${saved ? 'is-mint' : ''} !min-h-[54px]`} disabled={!name.trim() || (name.trim() === child.name && !saved)}>
                <Icon name="check" size={18} />{saved ? t('saved', lang) : t('save', lang)}
              </button>
            </div>
          </form>
        </div>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 p-0 font-bold">{t('childIs', lang)}</legend>
          <div className="inline-flex rounded-full bg-canvas p-1 shadow-[inset_2px_3px_6px_rgb(43_39_64/0.08)]" role="radiogroup">
            {(['f', 'm'] as const).map((g) => {
              const on = child.gender === g;
              return (
                <button key={g} type="button" role="radio" aria-checked={on} onClick={() => patch({ gender: g })}
                  className={`relative min-h-11 rounded-full px-5 font-display font-extrabold transition-colors ${on ? 'text-white' : 'text-ink-soft'}`}>
                  {on && <motion.span layoutId="gender-pill" className="absolute inset-0 rounded-full bg-blue shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)]" transition={spring} />}
                  <span className="relative">{t(g === 'f' ? 'girl' : 'boy', lang)}</span>
                </button>
              );
            })}
          </div>
          <p className="m-0 mt-1.5 text-sm text-ink-soft">{t('genderHelp', lang)}</p>
        </fieldset>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 p-0 font-bold">{t('avatarColor', lang)}</legend>
          <div className="flex flex-wrap gap-3" role="radiogroup">
            {AVATAR_COLORS.map(([a, b], i) => {
              const on = (child.avatar ?? 0) === i;
              return (
                <button key={i} type="button" role="radio" aria-checked={on} aria-label={`${t('avatarColor', lang)} ${i + 1}`}
                  onClick={() => patch({ avatar: i })}
                  className={`grid h-12 w-12 place-items-center rounded-full text-white transition active:scale-90 ${on ? 'ring-4 ring-ink/80 ring-offset-2' : ''}`}
                  style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
                  {on && <Icon name="check" size={20} />}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** One card per child: progress bars for numbers and letters (lessons mastered). */
function ChildrenProgress({ data, activeId, lang, onSelect }: { data: AppData; activeId: string; lang: Lang; onSelect: (id: string) => void }) {
  const paths = learningPath(loadLessons());
  const bars: { k: 'numbers' | 'letters' | 'wordsProgress' | 'talkProgress'; color: string; keys: string[] }[] = [
    { k: 'numbers', color: 'from-blue to-violet', keys: (paths.numbers ?? []).map((l) => l.id) },
    { k: 'letters', color: 'from-pink to-[#f97362]', keys: (paths.letters ?? []).map((l) => l.id) },
    { k: 'wordsProgress', color: 'from-mint to-[#0ea5e9]', keys: loadWordSets().map((w) => wordsKey(w.id)) },
    { k: 'talkProgress', color: 'from-sun to-[#f97316]', keys: loadReels().map((r) => talkKey(r.id)) },
  ];
  return (
    <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
      {data.children.map((c) => {
        const mastered = masteredIds(data.sessions, c.id);
        const active = c.id === activeId;
        const spoke = data.sessions.filter((x) => x.childId === c.id).flatMap((x) => x.attempts).filter((a) => a.activity === 'speak' && a.outcome === 'success').length;
        return (
          <li key={c.id}>
            <button onClick={() => onSelect(c.id)} aria-pressed={active}
              className={`clay flex w-full flex-col gap-3 p-4 text-left transition active:scale-[0.99] ${active ? 'ring-4 ring-blue/30' : ''}`}>
              <span className="flex items-center gap-3">
                <Avatar child={c} size={40} />
                <span className="min-w-0 flex-1 truncate font-display text-lg font-black">{c.name}</span>
                {active && <span className="rounded-full bg-blue-soft px-2.5 py-0.5 text-xs font-bold text-blue">{t('active', lang)}</span>}
              </span>
              {spoke > 0 && (
                <span className="flex items-center gap-1.5 text-sm font-bold text-pink">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg>
                  {t('spokeTimes', lang, { n: spoke })}
                </span>
              )}
              {bars.map(({ k, color, keys }) => {
                const path = keys;
                const n = keys.filter((id) => mastered.has(id)).length;
                const pct = path.length ? Math.round((n / path.length) * 100) : 0;
                return (
                  <span key={k} className="block">
                    <span className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-bold text-ink">{t(k, lang)}</span>
                      <span className="text-ink-soft">{t('masteredOf', lang, { n, total: path.length })}</span>
                    </span>
                    <span className="block h-4 overflow-hidden rounded-full bg-canvas shadow-[inset_1px_2px_4px_rgb(43_39_64/0.12)]"
                      role="progressbar" aria-valuemin={0} aria-valuemax={path.length} aria-valuenow={n} aria-label={`${c.name} · ${t(k, lang)}`}>
                      <motion.span
                        className={`block h-full rounded-full bg-gradient-to-r ${color} shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)]`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, n ? 6 : 0)}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.15 }}
                      />
                    </span>
                  </span>
                );
              })}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Create, change or remove the parent code. */
function ParentCodeSection({ data, update }: { data: AppData; update: (fn: (d: AppData) => AppData) => void }) {
  const lang = data.parentLang;
  const [step, setStep] = useState<'idle' | 'new' | 'confirm'>('idle');
  const [first, setFirst] = useState('');
  const [error, setError] = useState(0);
  const [saved, setSaved] = useState(false);
  const url = `${window.location.origin}/parent`;

  const onNew = (pin: string) => { setFirst(pin); setStep('confirm'); };
  const onConfirm = async (pin: string) => {
    if (pin !== first) {
      setError((e) => e + 1);
      setStep('new');
      return;
    }
    const hash = await hashPin(pin);
    update((d) => ({ ...d, parentPinHash: hash }));
    setStep('idle');
    setError(0);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <section id="parent-code" className="scroll-mt-24">
      <H2>{t('parentCode', lang)}</H2>
      <div className="clay flex flex-col gap-4 p-5">
        <p className="m-0 text-ink-soft">{t('parentCodeHelp', lang)}</p>
        {step === 'idle' ? (
          <>
            {data.parentPinHash && (
              <p className="m-0 flex items-center gap-2 font-bold text-mint-deep"><Icon name="check" size={18} />{saved ? t('codeSaved', lang) : t('codeActive', lang)}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button className="clay-btn" onClick={() => { setStep('new'); setError(0); }}>
                <Icon name="lock" size={18} />{data.parentPinHash ? t('changeCode', lang) : t('createCode', lang)}
              </button>
              {data.parentPinHash && (
                <button className="clay-btn is-white text-[#b91c1c]" onClick={() => update((d) => ({ ...d, parentPinHash: undefined }))}>
                  <Icon name="trash" size={18} />{t('removeCode', lang)}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <PinPad
              key={step}
              label={step === 'new' ? t('newCode', lang) : t('confirmCode', lang)}
              onComplete={step === 'new' ? onNew : onConfirm}
              shake={error}
              deleteLabel={t('deleteDigit', lang)}
            />
            {error > 0 && step === 'new' && <p role="alert" className="m-0 text-center font-medium text-[#b91c1c]">{t('codesDiffer', lang)}</p>}
            <button className="clay-btn is-ghost !min-h-11" onClick={() => setStep('idle')}>{t('cancel', lang)}</button>
          </div>
        )}
        <p className="m-0 rounded-[16px] bg-canvas p-3 text-sm break-words text-ink-soft">
          {t('parentLink', lang, { url })}
        </p>
      </div>
    </section>
  );
}
