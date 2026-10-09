import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, RefreshCw, Timer, Trophy } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { GenerationPicker, RecallInput, RecallRecords, roman } from '../components/Recall';
import { PokemonImage } from '../components/ui';
import { copy } from '../lib/i18n';
import { recallCopy } from '../lib/recall-i18n';
import { completionElapsed, createCompletionSession, formatCompletionTime, generationPool, saveCompletionRecord, submitCompletionGuess, type CompletionSession, type RecallGuess } from '../lib/recall';
import { useRecall } from '../lib/recall-store';
import { useProgress } from '../lib/store';

export default function Completion() {
  const { progress: main } = useProgress();
  const { progress, ready, update } = useRecall();
  const t = recallCopy[main.language];
  const [session, setSession] = useState<CompletionSession | null>(null);
  const [inputVersion, setInputVersion] = useState(0);
  const [now, setNow] = useState(0);
  const pool = session ? generationPool(session.generation) : [];
  const found = new Set(session?.found ?? []);
  const complete = session !== null && found.size === pool.length;
  const elapsed = session ? completionElapsed(session, now) : 0;
  const best = session ? progress.completionRecords[session.generation] : undefined;
  useEffect(() => {
    if (!session || session.finishedAt !== null) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 100);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [session?.startedAt, session?.finishedAt]);
  const newGame = (generation: number) => {
    const startedAt = Date.now();
    setNow(startedAt); setSession(createCompletionSession(generation, startedAt)); setInputVersion(value => value + 1);
  };
  const onGuess = (query: string): RecallGuess => {
    if (!session) return { status: 'unknown' };
    const next = submitCompletionGuess(session, query);
    setSession(next.session);
    if (next.session.finishedAt !== null) update(p => saveCompletionRecord(p, next.session));
    return next.result;
  };
  return <Layout><div className="game-page recall-page completion-page">
    <Link href="/" className="back-link"><ArrowLeft size={16} />{copy[main.language].back}</Link>
    <div className="game-heading"><div><div className="eyebrow"><BookOpen size={16} />{t.memory}</div><h1>{t.completion}</h1><p className="recall-description">{t.completionRules}</p></div></div>
    <div className="completion-toolbar">
      <GenerationPicker generation={session?.generation ?? null} disabled={!ready} onChange={g => { if (g !== session?.generation) newGame(g); }} />
      {session && <button className="button white completion-restart" onClick={() => newGame(session.generation)}><RefreshCw size={15} />{t.reset}</button>}
    </div>
    {!session ? <div className="completion-choose"><BookOpen size={28} /><p>{t.chooseToStart}</p></div> : <>
        <div className="recall-meter completion-meter"><div><span>{t.found} · {roman[session.generation - 1]}</span><strong>{found.size}<small> / {pool.length}</small></strong></div><div className="completion-times"><div><span><Timer size={14} />{t.elapsed}</span><strong role="timer" aria-label={t.elapsed}>{formatCompletionTime(elapsed)}</strong></div><div><span><Trophy size={14} />{t.personalBest}</span><strong data-testid="completion-best">{best === undefined ? '—' : formatCompletionTime(best)}</strong></div></div><span className="recall-percentage">{Math.floor(found.size / pool.length * 100)}%</span></div>
        <div className="dex-progress recall-progress" role="progressbar" aria-label={t.completion} aria-valuenow={found.size} aria-valuemin={0} aria-valuemax={pool.length}><span style={{ width: `${found.size / pool.length * 100}%` }} /></div>
        {complete ? <section className="result-panel win recall-complete" role="status"><Check size={28} /><h2>{t.completeTitle}</h2><p className="completion-finish-time">{t.elapsed}<strong>{formatCompletionTime(elapsed)}</strong></p><p>{t.completeText}</p><Link href="/sprint" className="button coral">{t.beginSprint}<ArrowRight size={16} /></Link></section> : <RecallInput key={inputVersion} onGuess={onGuess} />}
        <div className="completion-grid">{pool.map(pokemon => {
          const known = found.has(pokemon.id);
          const name = pokemon.names[main.language];
          return <article className={`completion-slot ${known ? 'remembered' : 'hidden-slot'}`} key={pokemon.id} aria-label={`#${pokemon.id} · ${known ? name : copy[main.language].unknown}`} title={known ? name : undefined}>
            <span className="completion-number">#{String(pokemon.id).padStart(3, '0')}</span>
            {known ? <PokemonImage pokemon={pokemon} /> : <span className="completion-question" aria-hidden="true">?</span>}
            <strong>{known ? name : '???'}</strong>
          </article>;
        })}</div>
    </>}
    <p className="completion-session-note">{t.sessionOnly}</p>
    <p className="completion-session-note">{t.completionTimeRules}</p>
    <details className="completion-record-summary"><summary><Trophy size={16} />{t.recordsTitle}</summary><RecallRecords progress={progress} mode="completion" language={main.language} /></details>
  </div></Layout>;
}
