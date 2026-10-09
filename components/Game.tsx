import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronRight, Clock3, Lightbulb, LockKeyhole, RefreshCw, Search, Share2, Sparkles, Trophy, X } from 'lucide-react';
import Layout from './layout/Layout';
import { Modal, Pokeball, PokemonImage, useClock } from './ui';
import { allGenerations, catalog, comparePokemon, createSession, MAX_GUESSES, pokemonById, revealHint, saveSession, searchPokemon, shareText, submitGuess, type Feedback, type Match, type Mode, type Pokemon, type Session } from '../lib/game';
import { copy, typeName } from '../lib/i18n';
import { useProgress } from '../lib/store';

const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function Clue({ label, value, match }: { label: string; value: string; match: Match }) {
  const { progress } = useProgress();
  const t = copy[progress.language];
  const description = match === 'correct' ? t.exact : match === 'partial' ? t.partial : match === 'higher' ? t.higher : match === 'lower' ? t.lower : t.wrong;
  return <div className={`clue ${match}`} title={description}>
    <span className="clue-label">{label}</span><strong>{value}{match === 'correct' ? <Check size={15} /> : match === 'higher' ? <ArrowUp size={16} /> : match === 'lower' ? <ArrowDown size={16} /> : match === 'partial' ? <span className="partial-symbol">↔</span> : <X size={13} />}</strong><span className="sr-only">{description}</span>
  </div>;
}

function GuessRow({ pokemon, feedback, index, won, animate }: { pokemon: Pokemon; feedback: Feedback; index: number; won: boolean; animate: boolean }) {
  const { progress } = useProgress();
  const t = copy[progress.language];
  return <article className={`guess-row ${won ? 'winning-row' : ''} ${animate ? 'reveal-row' : ''}`} aria-label={`${index + 1}. ${pokemon.names[progress.language]}`}>
    <div className="guess-pokemon"><span className="guess-index">{String(index + 1).padStart(2, '0')}</span><PokemonImage pokemon={pokemon} /><div><strong>{pokemon.names[progress.language]}</strong><span>#{String(pokemon.id).padStart(3, '0')}</span></div>{won && <Trophy className="guess-trophy" size={20} />}</div>
    <div className="clue-grid"><Clue label={t.generation} value={roman[pokemon.generation - 1]} match={feedback.generation} /><Clue label={t.type1} value={typeName(pokemon.types[0], progress.language)} match={feedback.firstType} /><Clue label={t.type2} value={typeName(pokemon.types[1], progress.language)} match={feedback.secondType} /><Clue label={t.stage} value={String(pokemon.stage)} match={feedback.stage} /></div>
  </article>;
}

function GuessSearch({ session, onGuess }: { session: Session; onGuess: (id: number) => void }) {
  const { progress } = useProgress();
  const t = copy[progress.language];
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Pokemon | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pool = catalog.filter(p => session.generations.includes(p.generation));
  const results = searchPokemon(query, pool);
  const listOpen = open && Boolean(query.trim()) && !selected;
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);
  useEffect(() => { setQuery(''); setSelected(null); setOpen(false); setActive(-1); }, [session.id, session.guesses.length]);
  useEffect(() => { if (active >= 0) document.getElementById(`pokemon-option-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active]);
  const choose = (pokemon: Pokemon) => {
    if (session.guesses.includes(pokemon.id)) return;
    setSelected(pokemon); setQuery(pokemon.names[progress.language]); setOpen(false); setError(false); input.current?.focus();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const exact = pool.find(p => [p.names.it, p.names.en, p.slug].some(name => name.toLowerCase() === query.trim().toLowerCase()));
    const pokemon = selected ?? exact;
    if (!pokemon || session.guesses.includes(pokemon.id)) { setError(true); return; }
    onGuess(pokemon.id); setQuery(''); setSelected(null); setOpen(false); input.current?.focus();
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      const available = results.map((p, i) => session.guesses.includes(p.id) ? -1 : i).filter(i => i >= 0);
      if (!available.length) return;
      const current = available.indexOf(active);
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActive(available[(current + direction + available.length) % available.length]);
    }
    if (event.key === 'Enter' && listOpen && active >= 0 && results[active]) { event.preventDefault(); choose(results[active]); }
  };
  return <div className="search-area" ref={ref}>
    <form onSubmit={submit} className="guess-form"><div className={`search-field ${selected ? 'has-selection' : ''}`}>
      {selected ? <PokemonImage pokemon={selected} /> : <Search size={21} />}
      <input ref={input} type="text" role="combobox" aria-autocomplete="list" aria-controls="pokemon-options" aria-expanded={listOpen} aria-activedescendant={listOpen && active >= 0 ? `pokemon-option-${active}` : undefined} aria-label={t.guessPlaceholder} placeholder={t.guessPlaceholder} autoComplete="off" value={selected ? selected.names[progress.language] : query} onChange={event => { setQuery(event.target.value); setSelected(null); setOpen(true); setActive(-1); setError(false); }} onKeyDown={keys} onFocus={() => setOpen(true)} />
      {query && <button type="button" className="clear-search" aria-label={t.close} onClick={() => { setQuery(''); setSelected(null); input.current?.focus(); }}><X size={17} /></button>}
    </div><button className="button coral guess-submit" type="submit" disabled={!query.trim()}>{t.guess}<ArrowRight size={18} /></button></form>
    {listOpen && <ul className="search-options" id="pokemon-options" role="listbox" aria-label={t.guessPlaceholder}>
      {results.map((pokemon, index) => <li id={`pokemon-option-${index}`} role="option" aria-selected={active === index} aria-disabled={session.guesses.includes(pokemon.id)} key={pokemon.id} className={`${active === index ? 'highlighted' : ''} ${session.guesses.includes(pokemon.id) ? 'disabled' : ''}`} onMouseDown={event => event.preventDefault()} onClick={() => choose(pokemon)}><PokemonImage pokemon={pokemon} /><span><strong>{pokemon.names[progress.language]}</strong><small>#{String(pokemon.id).padStart(3, '0')} · {t.generation} {roman[pokemon.generation - 1]}</small></span>{session.guesses.includes(pokemon.id) ? <small>{t.guessed}</small> : <ChevronRight size={18} />}</li>)}
      {!results.length && <li className="no-results" role="presentation">{t.noResults}</li>}
    </ul>}
    {error && <p className="search-error" role="alert">{t.searching}</p>}
  </div>;
}

function Notebook({ session }: { session: Session }) {
  const { progress } = useProgress();
  const t = copy[progress.language];
  const target = pokemonById.get(session.targetId)!;
  let genMin = Math.min(...session.generations), genMax = Math.max(...session.generations), stageMin = 1, stageMax = 3;
  const types = new Set<string>();
  for (const id of session.guesses) {
    const p = pokemonById.get(id)!;
    const f = comparePokemon(p, target);
    if (f.generation === 'correct') genMin = genMax = p.generation;
    if (f.generation === 'higher') genMin = Math.max(genMin, p.generation + 1);
    if (f.generation === 'lower') genMax = Math.min(genMax, p.generation - 1);
    if (f.stage === 'correct') stageMin = stageMax = p.stage;
    if (f.stage === 'higher') stageMin = Math.max(stageMin, p.stage + 1);
    if (f.stage === 'lower') stageMax = Math.min(stageMax, p.stage - 1);
    if (['correct', 'partial'].includes(f.firstType)) types.add(p.types[0]);
    if (p.types[1] && ['correct', 'partial'].includes(f.secondType)) types.add(p.types[1]);
  }
  return <section className="panel notebook"><span className="panel-icon mint"><Sparkles size={20} /></span><h2>{t.notebook}</h2><p>{t.notebookText}</p>{session.guesses.length === 0 ? <div className="empty-notes">{t.noClues}</div> : <div className="notes-list"><div><span>{t.generation}</span><strong>{genMin === genMax ? roman[genMin - 1] : `${roman[genMin - 1]}–${roman[genMax - 1]}`}</strong></div><div><span>{t.stage}</span><strong>{stageMin === stageMax ? stageMin : `${stageMin}–${stageMax}`}</strong></div>{[...types].map(type => <span className={`type-pill type-${type}`} key={type}><Check size={12} />{typeName(type, progress.language)}</span>)}</div>}</section>;
}

export default function Game({ mode }: { mode: Mode }) {
  const { progress, ready, update } = useProgress();
  const t = copy[progress.language];
  const { date, countdown } = useClock();
  const session = progress.sessions[mode];
  const initialized = useRef(false);
  const [generations, setGenerations] = useState(allGenerations);
  const [confirmNew, setConfirmNew] = useState(false);
  const [shareFallback, setShareFallback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [animatedGuess, setAnimatedGuess] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const statusRef = useRef(session?.status);
  useEffect(() => {
    if (!ready || !date) return;
    const current = progress.sessions[mode];
    if (!current || (mode !== 'practice' && current.date !== date && ((!initialized.current && current.status !== 'playing') || current.guesses.length === 0))) {
      update(p => saveSession(p, createSession(mode)));
    }
    if (!initialized.current && current && mode === 'practice') setGenerations(current.generations);
    initialized.current = true;
  }, [ready, date, mode, progress.sessions, update]);
  useEffect(() => {
    if (session?.status === 'won' && statusRef.current === 'playing') { setCelebrate(true); const timer = setTimeout(() => setCelebrate(false), 2200); statusRef.current = session.status; return () => clearTimeout(timer); }
    statusRef.current = session?.status;
  }, [session?.status]);
  useEffect(() => { setAnimatedGuess(null); }, [session?.id]);
  const onGuess = useCallback((id: number) => {
    setAnimatedGuess(id);
    update(p => { const current = p.sessions[mode]; if (!current) return p; const next = submitGuess(current, id); return next === current ? p : saveSession(p, next); });
  }, [mode, update]);
  const newGame = () => {
    update(p => saveSession(p, createSession(mode, generations, p.sessions[mode]?.targetId)));
    setConfirmNew(false); setCopied(false); setCelebrate(false);
  };
  const requestNew = () => session?.status === 'playing' && session.guesses.length ? setConfirmNew(true) : newGame();
  const share = async () => {
    if (!session) return;
    const path = mode === 'kanto' ? '/kanto' : mode === 'complete' ? '/classic' : '/training';
    const text = shareText(session, progress.language, window.location.origin + path);
    if (navigator.share) {
      try { await navigator.share({ title: 'Pokerdle', text }); return; }
      catch (error) { if ((error as Error).name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); setCopied(true); }
    catch { setShareFallback(text); }
  };
  const target = session ? pokemonById.get(session.targetId)! : null;
  return <Layout>
    <div className="game-page"><Link href="/" className="back-link"><ArrowLeft size={16} />{t.back}</Link>
      <div className="game-heading"><div><div className="eyebrow"><span className="status-dot" />{mode === 'practice' ? t.unlimited : t.daily}</div><h1>{t[mode]}<span className={`mode-label ${mode === 'kanto' ? 'mint' : mode === 'complete' ? 'lavender' : 'peach'}`}>{mode === 'kanto' ? '151' : mode === 'complete' ? '898' : '∞'}</span></h1></div>{mode !== 'practice' && <div className="reset-pill"><Clock3 size={17} /><div><span>{t.reset}</span><strong>{countdown}</strong></div></div>}</div>
      {!ready || !session || !target ? <div className="game-loading"><Pokeball className="loading-ball" /><span>Pokerdle…</span></div> : <div className="game-grid">
        <div className="game-board">
          {mode !== 'practice' && date && session.date !== date && <p className="old-puzzle">{t.oldPuzzle} {session.date}</p>}
          <div className="attempt-meter"><span>{t.attempts}<strong>{session.guesses.length}<span> / {MAX_GUESSES}</span></strong></span><div>{Array.from({ length: MAX_GUESSES }, (_, i) => <Pokeball key={i} className={i < session.guesses.length ? session.guesses[i] === session.targetId ? 'caught-ball' : 'spent-ball' : ''} />)}</div></div>
          <div className="guess-history">
            {session.guesses.length === 0 && <div className="empty-board"><div className="mystery-orbit"><Pokeball /><span>?</span><Sparkles size={23} /></div><h2>{t.mystery}</h2><p>{t.mysteryText}</p><div className="empty-clues">{[t.generation, t.type1, t.type2, t.stage].map(label => <span key={label}>{label}<strong>?</strong></span>)}</div></div>}
            {session.guesses.map((id, index) => <GuessRow key={`${session.id}:${id}`} pokemon={pokemonById.get(id)!} feedback={comparePokemon(pokemonById.get(id)!, target)} index={index} won={id === session.targetId} animate={animatedGuess === id} />)}
          </div>
          {session.status === 'playing' ? <GuessSearch session={session} onGuess={onGuess} /> : <section className={`result-panel ${session.status === 'won' ? 'win' : 'loss'}`} aria-live="polite">
            {celebrate && <div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 17) % 100}%`, '--delay': `${i % 5 * .08}s`, '--rotation': `${i * 43}deg`, background: ['#f27467', '#f1ce62', '#86cdb1', '#a999df'][i % 4] } as React.CSSProperties} />)}</div>}
            <div className="result-top"><PokemonImage pokemon={target} artwork className="result-art" /><div><span className="eyebrow">{session.status === 'won' ? t.added : t.revealed}</span><h2>{session.status === 'won' ? t.caught : t.lost}</h2><h3>{target.names[progress.language]} <span>#{String(target.id).padStart(3, '0')}</span></h3><p>{session.guesses.length}/8 {t.attempts.toLowerCase()}{session.assisted ? ` · ${t.assisted}` : ''}</p></div></div>
            <div className="result-actions"><button className="button coral" onClick={share}><Share2 size={17} />{copied ? t.copied : t.share}</button>{mode === 'practice' ? <button className="button white" onClick={newGame}><RefreshCw size={17} />{t.next}</button> : date !== session.date ? <button className="button white" onClick={newGame}>{t.nextDaily}<ArrowRight size={17} /></button> : <Link href="/training" className="button white">{t.keepPlaying}<ArrowRight size={17} /></Link>}</div>
            {mode !== 'practice' && session.date === date && <p className="result-note">{t.tomorrow}</p>}
          </section>}
          <div className="feedback-legend"><span><i className="correct" />{t.exact}</span><span><i className="partial" />{t.partial}</span><span><ArrowUp size={13} /><ArrowDown size={13} />{t.generation} / {t.stage}</span></div>
        </div>
        <aside className="game-sidebar">
          <Notebook session={session} />
          <section className="panel hint-panel"><span className="panel-icon yellow"><Lightbulb size={20} /></span><h2>{t.hint}</h2>{session.assisted ? <div className="revealed-hint"><span>{t.startsWith} {session.hintLanguage?.toUpperCase()}</span><strong>{target.names[session.hintLanguage ?? progress.language].slice(0, 1)}</strong><span><Check size={13} />{t.assisted}</span></div> : <><p>{session.guesses.length < 4 ? t.hintLocked : t.hintReady}</p><button className="button hint-button" disabled={session.guesses.length < 4 || session.status !== 'playing'} onClick={() => update(p => { const current = p.sessions[mode]; if (!current) return p; return saveSession(p, revealHint(current, p.language)); })}>{session.guesses.length < 4 ? <LockKeyhole size={15} /> : <Lightbulb size={15} />}{t.reveal}</button></>}</section>
          {mode === 'practice' && <section className="panel generation-panel"><h2>{t.generations}</h2><div className="generation-chips">{allGenerations.map(g => <button key={g} aria-pressed={generations.includes(g)} className={generations.includes(g) ? 'selected' : ''} onClick={() => setGenerations(previous => previous.includes(g) ? previous.length > 1 ? previous.filter(n => n !== g) : previous : [...previous, g].sort())}>{roman[g - 1]}</button>)}</div><p>{t.generationHelp}</p><button className="button white full" onClick={requestNew}><RefreshCw size={15} />{t.next}</button></section>}
        </aside>
      </div>}
      <div className="sr-only" aria-live="polite">{session ? `${session.guesses.length}/8 ${t.attempts}` : ''}</div>
    </div>
    {confirmNew && <Modal title={t.abandon} onClose={() => setConfirmNew(false)}><p className="modal-intro">{t.abandonText}</p><div className="modal-actions"><button className="button white" onClick={() => setConfirmNew(false)}>{t.cancel}</button><button className="button coral" onClick={newGame}>{t.confirm}</button></div></Modal>}
    {shareFallback && <Modal title={t.share} onClose={() => setShareFallback(null)}><p>{t.shareFallback}</p><textarea className="share-text" readOnly value={shareFallback} aria-label={t.share} onFocus={e => e.target.select()} /></Modal>}
  </Layout>;
}
