import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { collectionNumber, type Collection } from '../content/collections';
import { pictureUrl } from '../content/speak';
import type { Lang } from '../engine/types';
import { t, tr } from '../i18n';
import { Icon } from './Icon';

export interface CollectionItem {
  c: Collection;
  done: number;
  total: number;
}

/**
 * The numbered path of collections ("01 Bouche et sons" … "11 Les questions"), scrollable sideways.
 * Used by "Petits mots" and "Parler". A star marks a finished collection.
 */
export function CollectionPicker({ items, value, onChange, lang }: {
  items: CollectionItem[]; value: string; onChange: (id: string) => void; lang: Lang;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const row = useRef<HTMLDivElement>(null);
  // Keep the selected chip in view by scrolling only the chip row sideways (scrollIntoView would also
  // scroll the whole page down to it and hide the top of the screen on a small phone).
  useEffect(() => {
    const chip = refs.current[value];
    const box = row.current;
    if (!chip || !box) return;
    const left = chip.offsetLeft - (box.clientWidth - chip.offsetWidth) / 2;
    box.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [value]);

  return (
    <div ref={row} className="-mx-4 overflow-x-auto px-4 pb-2" role="group" aria-label={t('collectionsTitle', lang)}>
      <ul className="m-0 flex w-max list-none gap-2 p-0">
        {items.map(({ c, done, total }) => {
          const on = c.id === value;
          const complete = total > 0 && done >= total;
          return (
            <li key={c.id}>
              <motion.button
                ref={(el) => { refs.current[c.id] = el; }}
                onClick={() => onChange(c.id)}
                aria-pressed={on}
                aria-label={`${collectionNumber(c)} ${tr(c.title, lang)}, ${t('collectionOf', lang, { n: done, total })}`}
                whileTap={{ scale: 0.94 }}
                className={`relative flex h-[5.6rem] w-[5.4rem] flex-col items-center justify-center gap-0.5 rounded-[22px] border-[3px] px-1 text-center transition-colors ${
                  on ? 'border-blue bg-blue-soft shadow-[0_6px_0_#bcd0ff]' : 'border-white bg-white/90 shadow-[0_6px_14px_-8px_rgb(76_56_140/0.4)]'}`}
              >
                <span className={`absolute -top-2 -left-1 grid h-6 min-w-6 place-items-center rounded-full px-1 text-[0.7rem] font-black ${on ? 'bg-blue text-white' : 'bg-[#e3dcf3] text-ink-soft'}`}>
                  {collectionNumber(c)}
                </span>
                {complete && (
                  <span className="absolute -top-2 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-sun text-white" aria-hidden="true"><Icon name="sparkle" size={12} /></span>
                )}
                <img src={pictureUrl(c.icon)} alt="" className="h-8 w-8" draggable={false} />
                <span className="line-clamp-2 text-[0.72rem] leading-[1.05] font-black text-ink">{tr(c.title, lang)}</span>
                <span className="text-[0.65rem] font-bold text-ink-soft">{done}/{total}</span>
              </motion.button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
