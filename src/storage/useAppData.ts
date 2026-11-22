import { useCallback, useState } from 'react';
import { load, save, type AppData } from './store';

/** React state that is persisted to the device on every change. */
export function useAppData() {
  const [data, setData] = useState<AppData>(load);
  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);
  return [data, update] as const;
}
