import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { loadCatalog, pickSource, type ReelVideo } from '../content/reels';
import { BREAK_CHOICES, DAY_CHOICES, reelSettings, secondsWatched } from '../engine/reelPolicy';
import { dayKey } from '../engine/routine';
import { megabytes, remove, removeAll, save, savedUrls, storageUsage } from '../pwa/reelCache';
import { deleteFamilyVideo, MAX_FAMILY_BYTES, putFamilyVideo } from '../storage/familyDb';
import { t, tr } from '../i18n';
import { newId, type AppData, type Child, type ReelSettings } from '../storage/store';

const spring = { type: 'spring', stiffness: 300, damping: 26 } as const;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="m-0 mb-3 font-display text-xl font-black text-ink">{title}</h2>
      <div className="clay flex flex-col gap-4 p-5">{children}</div>
    </section>
  );
}

/** A row of exclusive choices (same look as the language switch). */
function Choice<T extends string | number>({ label, value, options, onChange, id }: {
  label: string; value: T; options: { v: T; text: string }[]; onChange: (v: T) => void; id: string;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 p-0 font-bold">{label}</legend>
      <div className="inline-flex flex-wrap rounded-[22px] bg-canvas p-1 shadow-[inset_2px_3px_6px_rgb(43_39_64/0.08)]" role="radiogroup">
        {options.map((o) => {
          const on = o.v === value;
          return (
            <button key={String(o.v)} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.v)}
              className={`relative min-h-11 rounded-full px-4 font-display font-extrabold transition-colors ${on ? 'text-white' : 'text-ink-soft'}`}>
              {on && <motion.span layoutId={`choice-${id}`} className="absolute inset-0 rounded-full bg-blue shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)]" transition={spring} />}
              <span className="relative">{o.text}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Parent tab "Vidéos": video breaks (limits, data), videos saved on the phone, and the family's own videos. */
export function VideosPanel({ data, update, child }: { data: AppData; update: (fn: (d: AppData) => AppData) => void; child: Child | null }) {
  const lang = data.parentLang;
  const cfg = reelSettings(data);
  const set = (patch: Partial<ReelSettings>) => update((d) => ({ ...d, reels: { ...d.reels, ...patch } }));
  const [catalog, setCatalog] = useState<ReelVideo[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [progress, setProgress] = useState<{ n: number; total: number } | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const film = useRef<HTMLInputElement>(null);
  const pick = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setSaved(await savedUrls());
    setUsage(await storageUsage());
  };
  useEffect(() => {
    void loadCatalog().then(setCatalog);
    void refresh();
  }, []);

  const isSaved = (v: ReelVideo) => saved.has(pickSource(v));
  const savedCount = catalog.filter(isSaved).length;
  const missingBytes = catalog.filter((v) => !isSaved(v)).reduce((a, v) => a + v.bytes, 0);
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;

  const downloadAll = async () => {
    const todo = catalog.filter((v) => !isSaved(v));
    setProgress({ n: 0, total: todo.length });
    let n = 0;
    for (const v of todo) {
      await save(pickSource(v));
      setProgress({ n: ++n, total: todo.length });
      await refresh();
    }
    setProgress(null);
  };

  const addFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) return setMessage(t('familyNotVideo', lang));
    if (file.size > MAX_FAMILY_BYTES) return setMessage(t('familyTooBig', lang, { mb: Math.round(MAX_FAMILY_BYTES / 1048576) }));
    try {
      const id = `family:${newId()}`;
      await putFamilyVideo(id, file);
      update((d) => ({ ...d, family: [...(d.family ?? []), { id, title: title.trim() || t('familyDefault', lang), bytes: file.size, createdAt: Date.now() }] }));
      setTitle('');
      setMessage(t('familyAdded', lang));
    } catch {
      setMessage(t('familyFailed', lang));
    }
  };

  const removeFamily = async (id: string) => {
    await deleteFamilyVideo(id).catch(() => undefined);
    update((d) => ({ ...d, family: (d.family ?? []).filter((f) => f.id !== id) }));
  };

  const todayMin = child ? Math.round(secondsWatched(data, child.id, dayKey(new Date())) / 60) : 0;
  const minutes = (n: number) => t('minutesShort', lang, { n });

  return (
    <div className="flex flex-col gap-7">
      <Card title={t('videoSettings', lang)}>
        <p className="m-0 text-ink-soft">{t('videoIntro', lang)}</p>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="peer sr-only" checked={cfg.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          <span className="relative mt-0.5 h-8 w-14 shrink-0 rounded-full bg-[#ddd6ee] transition-colors peer-checked:bg-blue peer-focus-visible:outline-4 peer-focus-visible:outline-violet after:absolute after:top-1 after:left-1 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-6" aria-hidden="true" />
          <span className="block font-bold">{t('videoEnabled', lang)}</span>
        </label>
        {cfg.enabled && (
          <>
            <Choice id="break" label={t('breakLength', lang)} value={cfg.breakMinutes} onChange={(v) => set({ breakMinutes: v })} options={BREAK_CHOICES.map((v) => ({ v, text: minutes(v) }))} />
            <Choice id="day" label={t('dayLimit', lang)} value={cfg.dayMinutes} onChange={(v) => set({ dayMinutes: v })} options={DAY_CHOICES.map((v) => ({ v, text: minutes(v) }))} />
            <Choice id="data" label={t('dataPolicy', lang)} value={cfg.data} onChange={(v) => set({ data: v })}
              options={[{ v: 'saved', text: t('dataSaved', lang) }, { v: 'wifi', text: t('dataWifi', lang) }, { v: 'always', text: t('dataAlways', lang) }]} />
            <p className="m-0 text-sm text-ink-soft">{t('dataHelp', lang)}</p>
            {child && <p className="m-0 flex items-center gap-2 rounded-[16px] bg-canvas p-3 font-bold"><Icon name="clock" size={18} className="text-blue" />{t('todayWatched', lang, { used: todayMin, max: cfg.dayMinutes })}</p>}
          </>
        )}
      </Card>

      <Card title={t('offlineTitle', lang)}>
        <p className="m-0 font-bold">{t('savedCount', lang, { n: savedCount, total: catalog.length })}</p>
        {usage && <p className="m-0 text-sm text-ink-soft">{t('storageUsed', lang, { used: megabytes(usage.used), quota: megabytes(usage.quota) })}</p>}
        <p className="m-0 text-sm text-ink-soft">{t('offlineHelp', lang)}</p>
        <div className="flex flex-wrap gap-2">
          <button className="clay-btn" onClick={downloadAll} disabled={!online || !!progress || savedCount >= catalog.length}>
            <Icon name="offline" size={18} />
            {progress ? t('downloading', lang, { n: progress.n, total: progress.total }) : `${t('downloadAll', lang)}${missingBytes ? ` (${megabytes(missingBytes)} ${t('mb', lang)})` : ''}`}
          </button>
          <button className="clay-btn is-white text-[#b91c1c]" onClick={async () => { await removeAll(); await refresh(); }} disabled={savedCount === 0}>
            <Icon name="trash" size={18} />{t('deleteDownloads', lang)}
          </button>
        </div>
        {!online && <p role="status" className="m-0 text-sm font-bold text-[#92400e]">{t('offlineNow', lang)}</p>}
      </Card>

      <Card title={t('familyTitle', lang)}>
        <p className="m-0 text-ink-soft">{t('familyHelp', lang)}</p>
        <div>
          <label htmlFor="family-title" className="mb-1.5 block font-bold">{t('familyName', lang)}</label>
          <input id="family-title" className="clay-input" value={title} maxLength={60} placeholder={t('familyDefault', lang)} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="clay-btn is-pink" onClick={() => film.current?.click()}><Icon name="play" size={18} />{t('familyFilm', lang)}</button>
          <button className="clay-btn is-white text-blue" onClick={() => pick.current?.click()}><Icon name="plus" size={18} />{t('familyPick', lang)}</button>
          <input ref={film} type="file" accept="video/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="family-film"
            onChange={(e) => { void addFile(e.target.files?.[0]); e.target.value = ''; }} />
          <input ref={pick} type="file" accept="video/*" className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="family-pick"
            onChange={(e) => { void addFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        {message && <p role="status" className="m-0 rounded-[16px] bg-sun-soft p-3 text-sm font-bold text-[#92400e]">{message}</p>}
        {(data.family ?? []).length === 0
          ? <p className="m-0 text-sm text-ink-soft">{t('familyEmpty', lang)}</p>
          : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {(data.family ?? []).map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-[18px] bg-canvas p-2.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink text-white"><Icon name="play" size={18} /></span>
                  <span className="min-w-0 flex-1"><strong className="block truncate">{f.title}</strong><span className="text-sm text-ink-soft">{megabytes(f.bytes)} {t('mb', lang)}</span></span>
                  <button className="grid h-11 w-11 place-items-center rounded-full text-[#b91c1c] transition hover:bg-white active:scale-90" onClick={() => removeFamily(f.id)} aria-label={`${t('delete', lang)} ${f.title}`}><Icon name="trash" size={20} /></button>
                </li>
              ))}
            </ul>
          )}
        <p className="m-0 text-sm text-ink-soft">{t('familyPrivacy', lang)}</p>
      </Card>

      <Card title={t('catalogTitle', lang)}>
        {catalog.length === 0 && <p className="m-0 text-ink-soft">{t('catalogEmpty', lang)}</p>}
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {catalog.map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-[18px] bg-canvas p-2.5">
              {v.poster ? <img src={v.poster} alt="" className="h-14 w-9 shrink-0 rounded-[8px] object-cover" /> : <span className="h-14 w-9" />}
              <span className="min-w-0 flex-1">
                <strong className="block leading-tight">{tr(v.title, lang)}</strong>
                <span className="text-sm text-ink-soft">{Math.round(v.seconds)} s · {megabytes(v.bytes)} {t('mb', lang)}</span>
              </span>
              {isSaved(v)
                ? <span className="inline-flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 text-xs font-bold text-mint-deep"><Icon name="check" size={14} />{t('savedLabel', lang)}</span>
                : <button className="clay-btn is-white !min-h-10 !px-3 text-sm text-blue" disabled={!online} onClick={async () => { await save(pickSource(v)); await refresh(); }}><Icon name="offline" size={16} />{t('saveOne', lang)}</button>}
              {isSaved(v) && <button className="grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-white" aria-label={`${t('delete', lang)} ${tr(v.title, lang)}`} onClick={async () => { await remove(pickSource(v)); await refresh(); }}><Icon name="trash" size={18} /></button>}
            </li>
          ))}
        </ul>
        {catalog[0]?.credit && <p className="m-0 text-xs text-ink-soft">{catalog[0].credit}</p>}
      </Card>
    </div>
  );
}

