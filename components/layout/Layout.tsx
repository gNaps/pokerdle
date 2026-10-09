import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, type ReactNode } from 'react';
import { BarChart3, BookOpen, Gamepad2, Heart, HelpCircle, ShieldCheck } from 'lucide-react';
import { copy } from '../../lib/i18n';
import { useProgress } from '../../lib/store';
import { useRecall } from '../../lib/recall-store';
import { Rules, Statistics } from '../Info';
import { Pokeball } from '../ui';

export default function Layout({ children }: { children: ReactNode }) {
  const { progress, setLanguage, temporary } = useProgress();
  const { temporary: recallTemporary } = useRecall();
  const t = copy[progress.language];
  const { pathname } = useRouter();
  const [modal, setModal] = useState<'rules' | 'stats' | null>(null);
  return <>
    <Head>
      <title>Pokerdle — {t.tagline}</title>
      <meta name="description" content={t.heroDescription} />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="theme-color" content="#faf9f6" />
      <link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="16x16 32x32 48x48 64x64 256x256" />
      <link rel="icon" href="/pokeball.svg" type="image/svg+xml" sizes="any" />
    </Head>
    <a className="skip-link" href="#main-content">{t.play}</a>
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Pokerdle home"><Pokeball /><span>pokerdle<span className="brand-dot">.</span></span></Link>
        <nav aria-label={progress.language === 'it' ? 'Navigazione principale' : 'Main navigation'}>
          <Link href="/" className={pathname !== '/pokedex' ? 'nav-link active' : 'nav-link'}><Gamepad2 size={18} /><span>{t.play}</span></Link>
          <Link href="/pokedex" className={pathname === '/pokedex' ? 'nav-link active' : 'nav-link'}><BookOpen size={18} /><span>{t.dex}</span></Link>
          <button className="nav-link" onClick={() => setModal('stats')} aria-label={t.stats}><BarChart3 size={18} /><span>{t.stats}</span></button>
        </nav>
        <div className="header-actions"><button className="icon-button help-button" onClick={() => setModal('rules')} aria-label={t.rules}><HelpCircle size={21} /></button><button className="language-toggle" onClick={() => setLanguage(progress.language === 'it' ? 'en' : 'it')} aria-label={progress.language === 'it' ? 'Switch to English' : 'Passa all’italiano'}>{progress.language.toUpperCase()}<span>⌄</span></button></div>
      </div>
    </header>
    {(temporary || recallTemporary) && <div className="storage-notice" role="status">{t.temporary}</div>}
    <main id="main-content" className="site-main">{children}</main>
    <footer className="site-footer"><div className="footer-top"><Link href="/" className="brand small"><Pokeball /><span>pokerdle.</span></Link><p><ShieldCheck size={15} />{t.local}</p><span>{t.fan} <Heart size={14} className="heart" /></span></div><p className="legal">{t.notAffiliated}</p></footer>
    {modal === 'rules' && <Rules onClose={() => setModal(null)} />}
    {modal === 'stats' && <Statistics onClose={() => setModal(null)} />}
  </>;
}
