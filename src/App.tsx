import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ChildMode } from './modes/ChildMode';
import { ParentGate } from './modes/ParentGate';
import { ParentMode } from './modes/ParentMode';
import { useAppData } from './storage/useAppData';

type Mode = 'child' | 'gate' | 'parent';

/**
 * Two addresses:
 *   /        → the child's space
 *   /parent  → the parent space (always behind the gate: parent code or multiplication)
 * The browser's back button moves between them.
 */
const PARENT_PATH = '/parent';
const isParentPath = () => window.location.pathname.replace(/\/+$/, '') === PARENT_PATH;

export function App() {
  const [data, update] = useAppData();
  const hasChildren = data.children.length > 0;
  // First launch (no child yet) or /parent address: start at the gate.
  const [mode, setMode] = useState<Mode>(() => (isParentPath() || !hasChildren ? 'gate' : 'child'));

  const go = (next: Mode) => {
    const path = next === 'child' ? '/' : PARENT_PATH;
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    setMode(next);
  };

  // Back / forward buttons
  useEffect(() => {
    const onPop = () => setMode(isParentPath() || !hasChildren ? 'gate' : 'child');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [hasChildren]);

  // Keep the address in sync on first load (e.g. first run on "/" shows the gate under /parent)
  useEffect(() => {
    if (mode !== 'child' && !isParentPath()) window.history.replaceState(null, '', PARENT_PATH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          className="h-full min-h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          {mode === 'gate' && (
            <ParentGate
              lang={data.parentLang}
              firstRun={!hasChildren}
              pinHash={data.parentPinHash}
              onPass={() => go('parent')}
              onCancel={hasChildren ? () => go('child') : undefined}
              onForgotPin={() => update((d) => ({ ...d, parentPinHash: undefined }))}
            />
          )}
          {mode === 'parent' && <ParentMode data={data} update={update} onChildMode={() => go('child')} />}
          {mode === 'child' && <ChildMode data={data} update={update} onParent={() => go('gate')} />}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
