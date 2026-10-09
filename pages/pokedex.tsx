import { useState } from 'react';
import { ArrowRight, BookOpen, Check, Lightbulb, LockKeyhole, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { Modal, PokemonImage } from '../components/ui';
import { allGenerations, captures, catalog, normalize, type Pokemon } from '../lib/game';
import { copy, typeName } from '../lib/i18n';
import { useProgress } from '../lib/store';

export default function Pokedex() {
  const { progress, ready } = useProgress();
  const t = copy[progress.language];
  const caught = captures(progress);
  const [query, setQuery] = useState('');
  const [generation, setGeneration] = useState(0);
  const [onlyCaught, setOnlyCaught] = useState(false);
  const [limit, setLimit] = useState(60);
  const [selected, setSelected] = useState<Pokemon | null>(null);
  const filtered = catalog.filter(p => (!generation || p.generation === generation) && (!onlyCaught || caught.has(p.id)) && (!query || (caught.has(p.id) && [p.names.it, p.names.en, p.slug, String(p.id)].some(name => normalize(name).includes(normalize(query))))));
  const capture = selected ? caught.get(selected.id) : null;
  return <Layout><div className="dex-page"><div className="eyebrow"><BookOpen size={16} />{t.dex.toUpperCase()}</div><div className="dex-heading"><div><h1>{t.dexTitle}</h1><p>{t.dexDescription}</p></div><div className="dex-count"><Sparkles size={22} /><strong>{ready ? caught.size : 0}<span> / 898</span></strong><span>{t.captured}</span></div></div>
    <div className="dex-progress"><span style={{ width: `${caught.size / 898 * 100}%` }} /></div>
    <div className="dex-toolbar"><label className="dex-search"><Search size={19} /><input placeholder={t.guessPlaceholder} aria-label={t.guessPlaceholder} value={query} onChange={e => { setQuery(e.target.value); setLimit(60); }} /></label><select aria-label={t.generation} value={generation} onChange={e => { setGeneration(Number(e.target.value)); setLimit(60); }}><option value={0}>{t.all}</option>{allGenerations.map(g => <option key={g} value={g}>{t.generation} {g}</option>)}</select><label className="caught-toggle"><input type="checkbox" checked={onlyCaught} onChange={e => { setOnlyCaught(e.target.checked); setLimit(60); }} />{t.onlyCaptured}</label></div>
    <div className="dex-grid">{filtered.slice(0, limit).map(p => caught.has(p.id) ? <button className="dex-card captured" key={p.id} onClick={() => setSelected(p)}><span className="dex-number">#{String(p.id).padStart(3, '0')}<Check size={14} /></span><PokemonImage pokemon={p} /><strong>{p.names[progress.language]}</strong><span>{p.types.map(type => <i key={type} className={`type-pill type-${type}`}>{typeName(type, progress.language)}</i>)}</span></button> : <div className="dex-card locked" key={p.id} aria-label={`#${p.id} ${t.unknown}`}><span className="dex-number">#{String(p.id).padStart(3, '0')}<LockKeyhole size={12} /></span><span className="unknown-pokemon">?</span><strong>???</strong><span>{t.unknown}</span></div>)}</div>
    {!filtered.length && <div className="dex-empty"><BookOpen size={36} /><p>{t.emptyDex}</p><Link className="button coral" href="/kanto">{t.start}<ArrowRight size={17} /></Link></div>}
    {filtered.length > limit && <button className="button white load-more" onClick={() => setLimit(previous => previous + 60)}>{t.more}<ArrowRight size={17} /></button>}
    {selected && capture && <Modal title={selected.names[progress.language]} onClose={() => setSelected(null)}><div className="capture-detail"><PokemonImage pokemon={selected} artwork /><div><p>{t.firstCatch}<strong>{new Date(capture.firstDate).toLocaleDateString(progress.language === 'it' ? 'it-IT' : 'en-GB')}</strong></p><p>{t.captures}<strong>{capture.count}</strong></p>{capture.assistedOnly && <span className="hint-detail"><Lightbulb size={16} />{t.assistedOnly}</span>}</div></div></Modal>}
  </div></Layout>;
}
