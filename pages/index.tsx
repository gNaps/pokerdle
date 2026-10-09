import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, BookOpen, Check, Clock3, Flame, Infinity, Search, Sparkles, Timer, Trophy } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { Rules } from '../components/Info';
import { Pokeball, useClock } from '../components/ui';
import { getStats, type Mode } from '../lib/game';
import { copy } from '../lib/i18n';
import { useProgress } from '../lib/store';
import { useRecall } from '../lib/recall-store';
import { recallCopy } from '../lib/recall-i18n';

const hrefs: Record<Mode, string> = { kanto: '/kanto', complete: '/classic', practice: '/training' };
export default function Home() {
  const { progress, ready } = useProgress();
  const { progress: recall, ready: recallReady } = useRecall();
  const t = copy[progress.language];
  const r = recallCopy[progress.language];
  const { date, countdown } = useClock();
  const [showRules, setShowRules] = useState(false);
  const status = (mode: Mode) => {
    const session = progress.sessions[mode];
    if (!ready || !session || (mode !== 'practice' && session.date !== date && session.status !== 'playing')) return null;
    return session.guesses.length ? session.status : null;
  };
  return <Layout>
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="status-dot" />{t.badge}</div>
        <h1>{t.heroStart}<br /><span>{t.heroEnd}</span></h1>
        <p>{t.heroDescription}</p>
        <div className="hero-buttons"><Link href="/kanto" className="button coral">{t.start}<ArrowRight size={19} /></Link><button className="text-button" onClick={() => setShowRules(true)}>{t.how}<span>↗</span></button></div>
        <div className="hero-meta"><span><Pokeball />8 {t.attempts.toLowerCase()}</span><span><Clock3 size={16} />24h</span><span><Sparkles size={16} />100% Pokémon</span></div>
      </div>
      <div className="hero-scene" aria-hidden="true">
        <div className="scene-orbit orbit-one" /><div className="scene-orbit orbit-two" />
        <span className="scene-star star-one">✦</span><span className="scene-star star-two">✧</span><span className="scene-star star-three">✦</span>
        <div className="floating-note note-top"><Sparkles size={18} /><span>{t.tagline}</span></div>
        <div className="hero-pokemon"><img src="/pokemon/25.png" width="380" height="380" alt="" fetchPriority="high" /></div>
        <div className="little-pokemon little-one"><img src="/pokemon/1.png" width="145" height="145" alt="" /></div>
        <div className="little-pokemon little-two"><img src="/pokemon/7.png" width="128" height="128" alt="" /></div>
        <div className="floating-note note-bottom"><span className="note-check"><Check size={16} /></span><span>Gotta guess ’em all!</span><Pokeball /></div>
        <span className="scene-dot dot-one" /><span className="scene-dot dot-two" />
      </div>
    </section>
    <section className="adventures" aria-labelledby="adventure-heading">
      <div className="section-heading"><div><div className="eyebrow muted-eyebrow">{t.today}</div><h2 id="adventure-heading">{t.choose}</h2><p>{t.chooseDescription}</p></div><div className="reset-pill"><Clock3 size={17} /><div><span>{t.reset}</span><strong>{countdown}</strong></div></div></div>
      <div className="mode-grid">
        {(['kanto', 'complete', 'practice'] as Mode[]).map((mode, index) => {
          const state = status(mode);
          const streak = getStats(progress, mode).streak;
          return <article className={`mode-card ${['mint-card', 'lavender-card', 'peach-card'][index]}`} key={mode}>
            <div className="card-top"><span className="card-kicker">{mode === 'practice' ? <Infinity size={14} /> : <span className="status-dot" />}{mode === 'practice' ? t.unlimited : t.daily}</span>{state === 'won' ? <span className="card-state"><Check size={14} />{t.added}</span> : streak > 0 ? <span className="streak-tag"><Flame size={15} />{streak}</span> : <span className="card-number">0{index + 1}</span>}</div>
            <div className="card-illustration"><span className="card-art-circle" /><img src={`/pokemon/${[1, 133, 4][index]}.png`} alt="" width="200" height="200" loading="lazy" /><span className="card-art-spark">✦</span></div>
            <div className="card-content"><span className="pool-tag">{mode === 'kanto' ? t.original : mode === 'complete' ? t.all : 'I · II · III · IV · V · VI · VII · VIII'}</span><h3>{t[mode]}</h3><p>{mode === 'kanto' ? t.kantoDescription : mode === 'complete' ? t.completeDescription : t.practiceDescription}</p>
              <Link href={hrefs[mode]} className="card-button">{state === 'playing' ? t.resume : state ? t.seeResult : mode === 'practice' ? t.train : t.enter}<ArrowRight size={19} /></Link>
            </div>
          </article>;
        })}
      </div>
    </section>
    <section className="adventures memory-adventures" aria-labelledby="memory-heading">
      <div className="section-heading"><div><div className="eyebrow muted-eyebrow">{r.memory}</div><h2 id="memory-heading">{r.heading}</h2><p>{r.subtitle}</p></div></div>
      <div className="mode-grid memory-mode-grid">{(['completion', 'sprint'] as const).map((mode, index) => {
        const active = recallReady && mode === 'sprint' && recall.sprint?.status === 'playing';
        return <article key={mode} className={`mode-card ${mode === 'completion' ? 'sky-card' : 'yellow-card'}`}>
          <div className="card-top"><span className="card-kicker">{mode === 'completion' ? <BookOpen size={14} /> : <Timer size={14} />}{mode === 'completion' ? r.noTimer : r.sixtySeconds}</span><span className="card-number">0{index + 4}</span></div>
          <div className="card-illustration"><span className="card-art-circle" /><img src={`/pokemon/${mode === 'completion' ? 7 : 25}.png`} alt="" width="200" height="200" loading="lazy" /><span className="card-art-spark">✦</span></div>
          <div className="card-content"><span className="pool-tag">{t.all}</span><h3>{r[mode]}</h3><p>{mode === 'completion' ? r.completionDescription : r.sprintDescription}</p><Link href={`/${mode}`} className="card-button">{active ? t.resume : mode === 'completion' ? r.beginCompletion : r.beginSprint}<ArrowRight size={19} /></Link></div>
        </article>;
      })}</div>
    </section>
    <section className="quick-guide" aria-label={t.rules}>
      {[[Search, t.guide1, t.guide1Text], [Sparkles, t.guide2, t.guide2Text], [Trophy, t.guide3, t.guide3Text]].map(([Icon, title, description], index) => {
        const Symbol = Icon as typeof Search;
        return <div className="guide-step" key={index}><span className={`guide-icon guide-${index}`}><Symbol size={23} /></span><div><h3><span>0{index + 1}.</span> {String(title)}</h3><p>{String(description)}</p></div></div>;
      })}
    </section>
    {showRules && <Rules onClose={() => setShowRules(false)} />}
  </Layout>;
}
