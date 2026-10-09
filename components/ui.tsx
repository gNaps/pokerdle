import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { copy } from '../lib/i18n';
import { useProgress } from '../lib/store';
import { utcDate, type Pokemon } from '../lib/game';

export function Pokeball({ className = '', label }: { className?: string; label?: string }) {
  return <span className={`pokeball ${className}`} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}><span /></span>;
}
export function PokemonImage({ pokemon, artwork = false, className = '' }: { pokemon: Pokemon; artwork?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [pokemon.id]);
  if (failed) return <span className={`image-fallback ${className}`} aria-label={pokemon.names.en}><Pokeball /></span>;
  const local = [1, 4, 7, 25, 133].includes(pokemon.id);
  const src = artwork && local ? `/pokemon/${pokemon.id}.png` : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${artwork ? 'other/official-artwork/' : ''}${pokemon.spriteId}.png`;
  return <img className={className} src={src} alt="" width={artwork ? 320 : 96} height={artwork ? 320 : 96} loading="lazy" onError={() => setFailed(true)} />;
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const { progress } = useProgress();
  useEffect(() => {
    const dialog = ref.current;
    const active = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; active?.focus(); };
  }, []);
  return <dialog ref={ref} className="modal" aria-labelledby={id} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
    <div className="modal-header"><h2 id={id}>{title}</h2><button className="icon-button" onClick={onClose} aria-label={copy[progress.language].close}><X size={21} /></button></div>
    {children}
  </dialog>;
}
export function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  const remaining = now ? 86400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) : null;
  const countdown = remaining === null ? '--:--:--' : [Math.floor(remaining / 3600), Math.floor(remaining % 3600 / 60), remaining % 60].map(n => String(n).padStart(2, '0')).join(':');
  return { now, date: now ? utcDate(now) : null, countdown };
}
