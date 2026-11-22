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

  if (mode === 'gate')
    return <ParentGate lang={data.parentLang} onPass={() => setMode('parent')} onCancel={data.children.length ? () => setMode('child') : undefined} />;
  if (mode === 'parent') return <ParentMode data={data} update={update} onChildMode={() => setMode('child')} />;
  return <ChildMode child={child} update={update} onParent={() => setMode('gate')} />;
}
