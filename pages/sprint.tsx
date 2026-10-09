import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Play, RefreshCw, Timer, Trophy } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { GenerationPicker, RecallInput, RecallRecords, RecallRules, roman } from '../components/Recall';
import { Pokeball, PokemonImage } from '../components/ui';
import { pokemonById } from '../lib/game';
import { copy } from '../lib/i18n';
import { recallCopy } from '../lib/recall-i18n';
import { sprintSeconds, startSprint, submitSprintGuess, type RecallGuess } from '../lib/recall';
import { useRecall } from '../lib/recall-store';
import { useProgress } from '../lib/store';

export default function Sprint() {
  const { progress: main } = useProgress();
  const { progress, ready, update } = useRecall();
  const t = recallCopy[main.language];
  const [now, setNow] = useState<number | null>(null);
  const generation = progress.sprintGeneration;
  const session = progress.sprint?.generation === generation ? progress.sprint : null;
  const playing = session?.status === 'playing';
  const seconds = session ? now === null ? 0 : sprintSeconds(session, now) : 60;
  const best = progress.records[generation]?.best ?? 0;
  useEffect(() => {
    setNow(Date.now());
    if (!playing) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 100);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [playing, session?.id]);
  const onGuess = (query: string): RecallGuess => {
    let result: RecallGuess = { status: 'expired' };
    update(p => { const next = submitSprintGuess(p, query); result = next.result; return next.progress; });
    return result;
  };
  const start = () => { setNow(Date.now()); update(p => startSprint(p)); };
  return <Layout><div className="game-page recall-page">
    <Link href="/" className="back-link"><ArrowLeft size={16} />{copy[main.language].back}</Link>
    <div className="game-heading"><div><div className="eyebrow"><Timer size={16} />{t.sixtySeconds}</div><h1>{t.sprint}</h1><p className="recall-description">{t.sprintDescription}</p></div></div>
    {!ready ? <div className="game-loading"><Pokeball className="loading-ball" /><span>Pokerdle…</span></div> : <div className="game-grid">
      <div className="recall-board">
        <GenerationPicker generation={generation} disabled={playing} onChange={g => update(p => ({ ...p, sprintGeneration: g }))} />
        <div className={`sprint-meter ${playing && seconds <= 10 ? 'urgent' : ''}`}>
          <div><span><Timer size={15} />{t.remaining}</span><strong role="timer" aria-label={t.remaining}>{String(playing ? seconds : session ? 0 : 60).padStart(2, '0')}<small>s</small></strong></div>
          <div><span>{t.score}</span><strong data-testid="sprint-score">{session?.found.length ?? 0}</strong></div>
          <div><span><Trophy size={15} />{t.personalBest}</span><strong>{best}</strong></div>
        </div>
        <div className="sprint-time-track" aria-hidden="true"><span style={{ width: `${(playing ? seconds : session ? 0 : 60) / 60 * 100}%` }} /></div>
        {playing ? <>
          <RecallInput key={session.id} onGuess={onGuess} focusOnMount />
          <div className="sr-only" role="status">{seconds === 10 ? (main.language === 'it' ? '10 secondi rimasti' : '10 seconds left') : ''}</div>
        </> : session ? <section className="result-panel win sprint-result" role="status"><span className="eyebrow">{t.sprint} · {roman[generation - 1]}</span><h2>{t.finishedTitle}</h2><p className="sprint-final-score">{session.found.length}<span>{t.score.toLowerCase()}</span></p><p>{t.finishedText}</p><button className="button coral" onClick={start}><RefreshCw size={16} />{t.retry}</button></section> : <section className="empty-board sprint-ready"><div className="mystery-orbit"><Pokeball /><Timer size={24} /></div><h2>{t.readyTitle}</h2><p>{t.readyText}</p><button className="button coral" onClick={start}><Play size={17} />{t.start}</button></section>}
        {session && <section className="sprint-found"><h2>{t.foundHeading}<span>{session.found.length}</span></h2>{!session.found.length ? <p className="muted">{t.emptySprint}</p> : <div className="sprint-found-grid">{[...session.found].reverse().map(id => {
          const pokemon = pokemonById.get(id)!;
          return <article className="sprint-found-card" key={id}><PokemonImage pokemon={pokemon} /><div><span>#{String(id).padStart(3, '0')}</span><strong>{pokemon.names[main.language]}</strong></div></article>;
        })}</div>}</section>}
      </div>
      <aside className="game-sidebar"><RecallRules mode="sprint" /><RecallRecords progress={progress} language={main.language} /></aside>
    </div>}
  </div></Layout>;
}
