import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { emptyProgress, parseProgress, STORAGE_KEY, type Language, type Progress } from './game';

interface Store {
  progress: Progress; ready: boolean; temporary: boolean;
  update: (fn: (previous: Progress) => Progress) => void;
  setLanguage: (language: Language) => void;
}
const Context = createContext<Store | null>(null);
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(emptyProgress());
  const [ready, setReady] = useState(false);
  const [temporary, setTemporary] = useState(false);
  const ref = useRef(progress);
  useEffect(() => {
    const language = navigator.language.startsWith('it') ? 'it' : 'en';
    let value = emptyProgress(language);
    try { value = parseProgress(localStorage.getItem(STORAGE_KEY), language); } catch { setTemporary(true); }
    ref.current = value; setProgress(value); setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = parseProgress(event.newValue, ref.current.language);
      ref.current = next; setProgress(next);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { document.documentElement.lang = progress.language; }, [progress.language]);
  const update = useCallback((fn: (previous: Progress) => Progress) => {
    const value = fn(ref.current);
    if (value === ref.current) return;
    ref.current = value; setProgress(value);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { setTemporary(true); }
  }, []);
  const setLanguage = useCallback((language: Language) => update(p => ({ ...p, language })), [update]);
  return <Context.Provider value={{ progress, ready, temporary, update, setLanguage }}>{children}</Context.Provider>;
}
export function useProgress() {
  const context = useContext(Context);
  if (!context) throw new Error('ProgressProvider is required');
  return context;
}
