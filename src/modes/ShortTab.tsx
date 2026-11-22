import { motion } from 'framer-motion';
import { CollectionPicker, type CollectionItem } from '../components/CollectionPicker';
import { Icon } from '../components/Icon';
import { COLLECTIONS, collectionById, collectionNumber } from '../content/collections';
import { shortKey, type ShortPack } from '../content/short';
import { pictureUrl } from '../content/speak';
import { SLOTS, currentSlot, type Slot } from '../engine/routine';
import type { Lang } from '../engine/types';
import { t, tr } from '../i18n';
import { SLOT_LABEL } from './ShortPlayer';

const SLOT_ICON: Record<Slot, string> = { morning: '2600', afternoon: '1f324', evening: '1f319' };
const tile = { hidden: { opacity: 0, scale: 0.6, y: 14 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 20 } } } as const;

interface Props {
  lang: Lang;
  packs: ShortPack[];
  open: Set<string>; // unlocked pack keys
  mastered: Set<string>;
  slotsToday: Set<Slot>;
  collection: string;
  setCollection: (id: string) => void;
  onStartSession: (slot: Slot) => void;
  onPickPack: (p: ShortPack) => void;
  onLocked: (p: ShortPack, before: ShortPack | undefined) => void;
  refused: { id: string; n: number } | null;
}

/** "Petits mots": today's three sessions, then the word packs of the chosen collection (01–07). */
export function ShortTab({ lang, packs, open, mastered, slotsToday, collection, setCollection, onStartSession, onPickPack, onLocked, refused }: Props) {
  const nowSlot = currentSlot();
  const items: CollectionItem[] = COLLECTIONS.filter((c) => packs.some((p) => p.collection === c.id)).map((c) => {
    const mine = packs.filter((p) => p.collection === c.id);
    return { c, total: mine.length, done: mine.filter((p) => mastered.has(shortKey(p.id))).length };
  });
  const col = collectionById(collection) ?? items[0].c;
  const mine = packs.filter((p) => p.collection === col.id);

  return (
    <div className="flex flex-col gap-4">
      {/* three short sessions a day */}
      <section className="clay !rounded-[28px] p-3" aria-label={t('sessionsToday', lang)}>
        <h3 className="m-0 px-1 text-lg font-black text-ink">{t('sessionsToday', lang)}</h3>
        <p className="m-0 mb-2 px-1 text-sm font-bold text-ink-soft">{t('sessionHelp', lang)}</p>
        <div className="grid grid-cols-3 gap-2">
          {SLOTS.map((s) => {
            const done = slotsToday.has(s);
            const suggested = s === nowSlot && !done;
            return (
              <motion.button
                key={s}
                onClick={() => onStartSession(s)}
                whileTap={{ scale: 0.94 }}
                animate={suggested ? { scale: [1, 1.04, 1] } : undefined}
                transition={suggested ? { duration: 1.6, repeat: Infinity } : undefined}
                aria-label={`${t('sessionTitle', lang, { slot: t(SLOT_LABEL[s], lang).toLowerCase() })}${done ? ' ✓' : ''}`}
                className={`relative flex min-h-[5.2rem] flex-col items-center justify-center gap-0.5 rounded-[20px] border-[3px] px-1 ${
                  done ? 'border-mint bg-mint-soft' : suggested ? 'border-sun bg-sun-soft' : 'border-white bg-canvas'}`}
              >
                <img src={pictureUrl(SLOT_ICON[s])} alt="" className="h-9 w-9" draggable={false} />
                <span className="text-[0.85rem] font-black text-ink">{t(SLOT_LABEL[s], lang)}</span>
                {done && <span className="absolute -top-2 -right-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-mint text-white" aria-hidden="true"><Icon name="check" size={15} /></span>}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* the 11-collection path (01–07 here) */}
      <CollectionPicker items={items} value={col.id} onChange={setCollection} lang={lang} />
      <h3 className="m-0 -mt-1 px-1 text-lg leading-tight font-black text-ink">
        <span className="mr-1.5 rounded-full bg-blue px-2 py-0.5 text-sm text-white">{collectionNumber(col)}</span>
        {tr(col.title, lang)}
        <span className="block text-sm font-bold text-ink-soft">{tr(col.purpose, lang)}</span>
      </h3>

      <motion.ul key={col.id} className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
        {mine.map((p, i) => {
          const key = shortKey(p.id);
          const locked = !open.has(key);
          const wiggle = refused?.id === key;
          // sound packs: the picture is the same for every item, so show the sounds themselves
          const sameImage = p.words.every((w) => w.image === p.words[0].image) && p.kind !== 'listen';
          return (
            <motion.li key={p.id} variants={tile}>
              <motion.button
                key={wiggle ? `w${refused?.n}` : 'still'}
                onClick={() => (locked ? onLocked(p, mine[i - 1]) : onPickPack(p))}
                whileTap={{ scale: 0.92 }}
                animate={wiggle ? { rotate: [0, -8, 8, -5, 5, 0] } : undefined}
                aria-label={locked ? `${tr(p.title, lang)} (${t('lockedLabel', lang)})` : tr(p.title, lang)}
                aria-disabled={locked}
                className={`clay relative flex w-full flex-col items-center gap-1.5 !rounded-[24px] p-3 ${locked ? '!bg-[#ece8f6] !shadow-none' : ''}`}
              >
                <span className={`grid grid-cols-2 place-items-center gap-1.5 ${locked ? 'opacity-35 grayscale' : ''}`}>
                  {p.words.slice(0, 4).map((w) => sameImage
                    ? <span key={w.id} className="grid h-9 w-11 place-items-center rounded-[12px] bg-blue-soft font-display text-lg font-black text-blue">{tr(w.word, lang)}</span>
                    : <img key={w.id} src={pictureUrl(w.image)} alt="" className="h-9 w-9" draggable={false} />)}
                </span>
                <span className={`text-center text-[0.85rem] leading-tight font-black ${locked ? 'text-[#b9b0d3]' : 'text-ink'}`}>
                  {p.kind === 'listen' && <Icon name="sound" size={14} className="mr-1 inline" />}{tr(p.title, lang)}
                </span>
                {locked && <span className="absolute -right-1.5 -bottom-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-canvas bg-white text-ink-soft shadow-sm" aria-hidden="true"><Icon name="lock" size={13} /></span>}
                {mastered.has(key) && <span className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full border-[3px] border-white bg-sun text-white shadow-md" aria-hidden="true"><Icon name="sparkle" size={16} /></span>}
              </motion.button>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
