import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { emptyRecallProgress, finishSprint, parseRecallProgress, RECALL_STORAGE_KEY, type RecallProgress } from './recall';

interface RecallStore {
  progress: RecallProgress; ready: boolean; temporary: boolean;
  update: (fn: (previous: RecallProgress) => RecallProgress) => void;
}
const Context = createContext<RecallStore | null>(null);

export function RecallProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(emptyRecallProgress);
  const [ready, setReady] = useState(false);
  const [temporary, setTemporary] = useState(false);
  const ref = useRef(progress);
  const update = useCallback((fn: (previous: RecallProgress) => RecallProgress) => {
    const value = fn(finishSprint(ref.current));
    if (value === ref.current) return;
    ref.current = value; setProgress(value);
    try { localStorage.setItem(RECALL_STORAGE_KEY, JSON.stringify(value)); } catch { setTemporary(true); }
  }, []);

  useEffect(() => {
    let value = emptyRecallProgress();
    try {
      const raw = localStorage.getItem(RECALL_STORAGE_KEY);
      value = parseRecallProgress(raw);
      if (raw && raw !== JSON.stringify(value)) localStorage.setItem(RECALL_STORAGE_KEY, JSON.stringify(value));
    } catch { setTemporary(true); }
    ref.current = value; setProgress(value); setReady(true);
    update(p => p);
    const sync = (event: StorageEvent) => {
      if (event.key !== RECALL_STORAGE_KEY) return;
      const next = parseRecallProgress(event.newValue);
      ref.current = next; setProgress(next); update(p => p);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [update]);

  useEffect(() => {
    if (!ready || progress.sprint?.status !== 'playing') return;
    const check = () => update(p => p);
    const timer = window.setInterval(check, 250);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('pageshow', check);
    return () => {
      clearInterval(timer); document.removeEventListener('visibilitychange', check);
      window.removeEventListener('pageshow', check);
    };
  }, [ready, progress.sprint?.status, update]);

  return <Context.Provider value={{ progress, ready, temporary, update }}>{children}</Context.Provider>;
}

export function useRecall() {
  const context = useContext(Context);
  if (!context) throw new Error('RecallProvider is required');
  return context;
}
