import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useState } from 'react';
import { ChildMode } from './modes/ChildMode';
import { ParentGate } from './modes/ParentGate';
import { ParentMode } from './modes/ParentMode';
import { useAppData } from './storage/useAppData';

type Mode = 'child' | 'gate' | 'parent';

export function App() {
  const [data, update] = useAppData();
  // First launch: the parent must set things up first.
  const [mode, setMode] = useState<Mode>(data.children.length ? 'child' : 'gate');
  const child = data.children.find((c) => c.id === data.activeChildId) ?? null;

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
              firstRun={data.children.length === 0}
              onPass={() => setMode('parent')}
              onCancel={data.children.length ? () => setMode('child') : undefined}
            />
          )}
          {mode === 'parent' && <ParentMode data={data} update={update} onChildMode={() => setMode('child')} />}
          {mode === 'child' && <ChildMode child={child} update={update} onParent={() => setMode('gate')} />}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
