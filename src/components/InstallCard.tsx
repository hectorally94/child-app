import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { Lang } from '../engine/types';
import { t } from '../i18n';
import { useInstall } from '../pwa/install';
import { Icon } from './Icon';

/** Card offering to install the app on the phone (parent side only). */
export function InstallCard({ lang, compact = false }: { lang: Lang; compact?: boolean }) {
  const { canPrompt, showIosHelp, prompt } = useInstall();
  const [hidden, setHidden] = useState(false);
  const visible = !hidden && (canPrompt || showIosHelp);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`clay flex items-start gap-3 bg-blue-soft! ${compact ? 'p-3' : 'p-4'}`}
          role="region"
          aria-label={t('installTitle', lang)}
        >
          <img src="/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-[14px] shadow-md" />
          <div className="min-w-0 flex-1">
            <p className="m-0 font-display text-lg leading-tight font-black text-ink">{t('installTitle', lang)}</p>
            <p className="m-0 mt-1 text-sm text-ink-soft">{showIosHelp ? t('installIos', lang) : t('installText', lang)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {canPrompt && (
                <button className="clay-btn !min-h-11 text-base" onClick={prompt}>
                  <Icon name="offline" size={18} />{t('installButton', lang)}
                </button>
              )}
              <button className="clay-btn is-ghost !min-h-11 !px-2 text-base" onClick={() => setHidden(true)}>{t('later', lang)}</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
