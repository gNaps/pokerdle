import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Send, Timer, Trophy } from 'lucide-react';
import { allGenerations, type Language } from '../lib/game';
import { recallCopy } from '../lib/recall-i18n';
import { formatCompletionTime, generationPool, type RecallGuess, type RecallProgress } from '../lib/recall';
import { useProgress } from '../lib/store';

export const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export function GenerationPicker({ generation, onChange, disabled = false }: {
  generation: number | null; onChange: (generation: number) => void; disabled?: boolean;
}) {
  const { progress } = useProgress();
  const t = recallCopy[progress.language];
  return <fieldset className="recall-generations" disabled={disabled}>
    <legend>{t.generation}</legend>
    <div className="generation-chips">{allGenerations.map(g => <button key={g} type="button" aria-pressed={g === generation} aria-label={`${roman[g - 1]} · ${generationPool(g).length} Pokémon`} className={g === generation ? 'selected' : ''} onClick={() => onChange(g)}>{roman[g - 1]}<span>{generationPool(g).length}</span></button>)}</div>
  </fieldset>;
}

export function RecallInput({ onGuess, focusOnMount = false }: { onGuess: (query: string) => RecallGuess; focusOnMount?: boolean }) {
  const { progress } = useProgress();
  const t = recallCopy[progress.language];
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<RecallGuess | null>(null);
  useEffect(() => { if (focusOnMount) input.current?.focus(); }, [focusOnMount]);
  return <div className="recall-entry">
    <form className="guess-form" onSubmit={event => {
      event.preventDefault();
      if (!query.trim()) return;
      const next = onGuess(query); setResult(next);
      if (next.status === 'accepted') setQuery('');
      else input.current?.select();
      input.current?.focus();
    }}>
      <label className="search-field"><BookOpen size={20} /><span className="sr-only">{t.nameLabel}</span><input ref={input} value={query} onChange={event => setQuery(event.target.value)} placeholder={t.placeholder} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="send" maxLength={80} /></label>
      <button className="button coral guess-submit" type="submit" disabled={!query.trim()}>{t.submit}<Send size={16} /></button>
    </form>
    <div className={`recall-feedback ${result?.status === 'accepted' ? 'accepted' : ''}`} role="status" aria-live="polite" aria-atomic="true">{result ? result.status === 'accepted' ? <><Check size={15} />{t.accepted} {result.pokemon?.names[progress.language]}</> : t[result.status] : t.nameHelp}</div>
  </div>;
}

export function RecallRecords({ progress, language, mode = 'sprint' }: { progress: RecallProgress; language: Language; mode?: 'completion' | 'sprint' }) {
  const t = recallCopy[language];
  return <section className="panel recall-records">
    <span className="panel-icon yellow"><Trophy size={20} /></span>
    <h2>{mode === 'completion' ? t.completion : t.recordsTitle}</h2>
    <div className="recall-record-list">{allGenerations.map(g => {
      const record = progress.records[g];
      if (mode === 'completion') {
        const best = progress.completionRecords[g];
        return <div key={g}><span>{roman[g - 1]}</span><strong>{best === undefined ? '—' : formatCompletionTime(best)}</strong><small>{best === undefined ? t.noRecord : t.bestTime}</small></div>;
      }
      return <div key={g}><span>{roman[g - 1]}</span><strong>{record ? `${record.best}` : '—'}</strong><small>{record ? `${record.played} ${t.rounds.toLowerCase()}` : t.noRecord}</small></div>;
    })}</div>
  </section>;
}

export function RecallRules({ mode }: { mode: 'completion' | 'sprint' }) {
  const { progress } = useProgress();
  const t = recallCopy[progress.language];
  return <section className="panel recall-rules"><span className={`panel-icon ${mode === 'sprint' ? 'yellow' : 'mint'}`}>{mode === 'sprint' ? <Timer size={20} /> : <BookOpen size={20} />}</span><h2>{mode === 'sprint' ? t.sixtySeconds : t.noTimer}</h2><p>{mode === 'sprint' ? t.sprintRules : t.completionRules}</p><p>{mode === 'sprint' ? t.timerRules : t.sessionOnly}</p></section>;
}
