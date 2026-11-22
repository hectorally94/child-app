import { useState } from 'react';
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

export function ParentMode({ data, update, onChildMode }: Props) {
  const lang = data.parentLang;
  const child = data.children.find((c) => c.id === data.activeChildId) ?? null;
  const [tab, setTab] = useState<Tab>(child ? 'dashboard' : 'settings');
  const [preview, setPreview] = useState<Lesson | null>(null);

  const setChild = (patch: Partial<Child>) =>
    update((d) => ({ ...d, children: d.children.map((c) => (c.id === d.activeChildId ? { ...c, ...patch } : c)) }));

  return (
    <div className="parent">
      <header className="p-header">
        <div className="p-brand">
          <span className="p-brand-mark" aria-hidden="true">0</span>
          <span>{child ? child.name : t('parentArea', lang)}</span>
        </div>
        <button className="btn-sun" onClick={onChildMode} disabled={!child}>{t('startChildMode', lang)}</button>
      </header>

      <nav className="p-tabs" aria-label={t('parentArea', lang)}>
        {(['dashboard', 'lessons', 'settings'] as Tab[]).map((k) => (
          <button key={k} className={tab === k ? 'is-on' : ''} aria-current={tab === k ? 'page' : undefined}
            onClick={() => { setTab(k); setPreview(null); }}>
            {t(k, lang)}
          </button>
        ))}
      </nav>

      <main className="p-body">
        {tab === 'dashboard' && <Dashboard data={data} child={child} lang={lang} onOpen={(l) => { setTab('lessons'); setPreview(l); }} />}
        {tab === 'lessons' && (preview
          ? <Preview lesson={preview} lang={lang} child={child}
              onBack={() => setPreview(null)}
              onAssign={() => setChild({ todayLessonId: preview.id })} />
          : <Catalogue lang={lang} child={child} onOpen={setPreview} />)}
        {tab === 'settings' && <Settings data={data} update={update} />}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Dashboard({ data, child, lang, onOpen }: { data: AppData; child: Child | null; lang: Lang; onOpen: (l: Lesson) => void }) {
  if (!child) return <p className="p-empty">{t('noChild', lang)}</p>;
  const sessions = data.sessions.filter((s) => s.childId === child.id);
  const rows = loadLessons()
    .map((l) => ({ lesson: l, sum: summarize(l.id, sessions, lang) }))
    .filter((r): r is { lesson: Lesson; sum: LessonSummary } => r.sum !== null)
    .sort((a, b) => b.sum.lastAt - a.sum.lastAt);
  const today = loadLessons().find((l) => l.id === child.todayLessonId);

  return (
    <>
      <section className="p-section">
        <h2>{t('todayActivity', lang)}</h2>
        {today
          ? <button className="p-lesson-row" onClick={() => onOpen(today)}>
              <span className="p-glyph">{today.target}</span>
              <span><strong>{tr(today.title, lang)}</strong><br /><span className="muted">{tr(today.objective, lang)}</span></span>
            </button>
          : <p className="muted">{t('noActivity', lang)}</p>}
      </section>

      <section className="p-section">
        <h2>{t('progress', lang)}</h2>
        {rows.length === 0 && <p className="muted">{t('noProgress', lang)}</p>}
        <ul className="p-progress">
          {rows.map(({ lesson, sum }) => (
            <li key={lesson.id}>
              <div className="p-progress-head">
                <span className="p-glyph">{lesson.target}</span>
                <strong>{tr(lesson.title, lang)}</strong>
                <span className={`p-status is-${sum.status}`}>{t(sum.status === 'practiced' ? 'practiced' : sum.status === 'needsPractice' ? 'needsPractice' : 'inProgress', lang)}</span>
              </div>
              <p className="p-facts">
                {sum.attempts} {t('attempts', lang)}, {sum.minutes} {t('minutes', lang)}, {new Date(sum.lastAt).toLocaleDateString(lang === 'en' ? 'en' : 'fr')}
              </p>
              {sum.notes.length > 0 && <ul className="p-notes">{sum.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Catalogue({ lang, child, onOpen }: { lang: Lang; child: Child | null; onOpen: (l: Lesson) => void }) {
  const lessons = loadLessons();
  const areas = [...new Set(lessons.map((l) => l.area))];
  const areaName: Record<string, { en: string; fr: string }> = {
    writing: { en: 'Writing', fr: 'Écriture' }, numbers: { en: 'Numbers', fr: 'Nombres' },
    language: { en: 'Language', fr: 'Langage' }, reading: { en: 'Reading', fr: 'Lecture' }, discovery: { en: 'Discovery', fr: 'Découverte' },
  };
  return (
    <>
      {areas.map((area) => (
        <section className="p-section" key={area}>
          <h2>{tr(areaName[area], lang)}</h2>
          <ul className="p-list">
            {lessons.filter((l) => l.area === area).map((l) => (
              <li key={l.id}>
                <button className="p-lesson-row" onClick={() => onOpen(l)}>
                  <span className="p-glyph">{l.target}</span>
                  <span>
                    <strong>{tr(l.title, lang)}</strong>
                    {child?.todayLessonId === l.id && <span className="p-tag">{t('isToday', lang)}</span>}
                    <br /><span className="muted">{tr(l.objective, lang)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Preview({ lesson, lang, child, onBack, onAssign }: { lesson: Lesson; lang: Lang; child: Child | null; onBack: () => void; onAssign: () => void }) {
  const isToday = child?.todayLessonId === lesson.id;
  return (
    <article className="p-preview">
      <button className="btn-quiet back" onClick={onBack}>‹ {t('lessons', lang)}</button>
      <div className="p-preview-head">
        <span className="p-glyph is-big">{lesson.target}</span>
        <div>
          <h2>{tr(lesson.title, lang)}</h2>
          <p className="p-offline">{t('availableOffline', lang)}</p>
        </div>
      </div>
      <h3>{t('objective', lang)}</h3>
      <p>{tr(lesson.objective, lang)}</p>
      <h3>{t('steps', lang)}</h3>
      <ol className="p-steps">
        {lesson.activities.map((a, i) => (
          <li key={i}>{tr(a.say, lang)}</li>
        ))}
      </ol>
      <h3>{t('howToHelp', lang)}</h3>
      <p>{tr(lesson.parentGuide, lang)}</p>
      <button className="btn-ink" onClick={onAssign} disabled={!child || isToday}>
        {isToday ? t('isToday', lang) : t('setToday', lang)}
      </button>
      {!child && <p className="muted">{t('noChild', lang)}</p>}
    </article>
  );
}

function Settings({ data, update }: { data: AppData; update: (fn: (d: AppData) => AppData) => void }) {
  const lang = data.parentLang;
  const [name, setName] = useState('');
  const child = data.children.find((c) => c.id === data.activeChildId);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const c: Child = { id: newId(), name: clean, childLang: lang, todayLessonId: loadLessons()[0]?.id ?? null };
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
    <>
      <section className="p-section">
        <h2>{t('children', lang)}</h2>
        <ul className="p-list">
          {data.children.map((c) => (
            <li key={c.id} className="p-child">
              <span className="p-avatar" aria-hidden="true">{c.name.slice(0, 1).toUpperCase()}</span>
              <strong>{c.name}</strong>
              {c.id === data.activeChildId
                ? <span className="p-tag">{t('active', lang)}</span>
                : <button className="btn-quiet" onClick={() => update((d) => ({ ...d, activeChildId: c.id }))}>{t('select', lang)}</button>}
              <button className="btn-quiet danger" onClick={() => remove(c.id)}>{t('delete', lang)}</button>
            </li>
          ))}
        </ul>
        <form className="p-add" onSubmit={add}>
          <label htmlFor="child-name">{t('childName', lang)}</label>
          <div className="row">
            <input id="child-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="off" />
            <button className="btn-ink" type="submit">{t('addChild', lang)}</button>
          </div>
        </form>
      </section>

      <section className="p-section">
        <h2>{t('settings', lang)}</h2>
        <LangPicker id="parent-lang" label={t('parentLanguage', lang)} value={lang}
          onChange={(v) => update((d) => ({ ...d, parentLang: v }))} />
        {child && <LangPicker id="child-lang" label={`${t('childLanguage', lang)} (${child.name})`} value={child.childLang}
          onChange={(v) => update((d) => ({ ...d, children: d.children.map((c) => (c.id === child.id ? { ...c, childLang: v } : c)) }))} />}
        <p className="muted small">{t('privacyNote', lang)}</p>
      </section>
    </>
  );
}

function LangPicker({ id, label, value, onChange }: { id: string; label: string; value: Lang; onChange: (v: Lang) => void }) {
  return (
    <div className="p-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as Lang)}>
        {LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}{l === 'rn' ? ' (beta)' : ''}</option>)}
      </select>
    </div>
  );
}
