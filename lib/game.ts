import rawCatalog from '../data/catalog.json';

export type Language = 'it' | 'en';
export type Mode = 'kanto' | 'complete' | 'practice';
export type Match = 'correct' | 'partial' | 'wrong' | 'higher' | 'lower';
export interface Pokemon {
  id: number; slug: string; names: Record<Language, string>;
  generation: number; types: string[]; stage: number; spriteId: number;
}
export interface Feedback { generation: Match; firstType: Match; secondType: Match; stage: Match }
export interface Session {
  id: string; mode: Mode; date: string; targetId: number; guesses: number[];
  status: 'playing' | 'won' | 'lost'; assisted: boolean; hintLanguage?: Language;
  generations: number[];
}
export interface Completion {
  id: string; mode: Mode; date: string; targetId: number; won: boolean;
  attempts: number; assisted: boolean; completedAt: string;
}
export interface Progress {
  version: 2; language: Language; sessions: Partial<Record<Mode, Session>>; results: Completion[];
}
export const catalog: Pokemon[] = rawCatalog;
export const MAX_GUESSES = 8;
export const STORAGE_KEY = 'pokerdle:v2';
export const allGenerations = [1, 2, 3, 4, 5, 6, 7, 8];
export const pokemonById = new Map(catalog.map(p => [p.id, p]));
export const utcDate = (now = new Date()) => now.toISOString().slice(0, 10);
export const normalize = (value: string) => value.toLowerCase().replace(/♀/g, 'f').replace(/♂/g, 'm').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export function searchPokemon(query: string, pool = catalog): Pokemon[] {
  const needle = normalize(query);
  if (!needle) return [];
  return pool.filter(p => [p.slug, p.names.it, p.names.en, String(p.id)].some(name => normalize(name).includes(needle)))
    .sort((a, b) => Number(!normalize(a.names.en).startsWith(needle)) - Number(!normalize(b.names.en).startsWith(needle)) || a.id - b.id).slice(0, 12);
}

export function dailyTarget(mode: Exclude<Mode, 'practice'>, date = utcDate()): Pokemon {
  // A versioned affine permutation, coprime stride, stable across builds/time zones.
  const pool = mode === 'kanto' ? catalog.slice(0, 151) : catalog;
  const day = Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000);
  const offset = mode === 'kanto' ? 31 : 257;
  return pool[((day * 137 + offset) % pool.length + pool.length) % pool.length];
}

export function createSession(mode: Mode, generations = allGenerations, previousTarget?: number, now = new Date()): Session {
  const date = utcDate(now);
  const validGenerations = allGenerations.filter(g => generations.includes(g));
  if (mode === 'practice' && !validGenerations.length) throw new Error('Choose at least one generation');
  const pool = catalog.filter(p => validGenerations.includes(p.generation) && p.id !== previousTarget);
  const target = mode === 'practice' ? pool[Math.floor(Math.random() * pool.length)] : dailyTarget(mode, date);
  return { id: mode === 'practice' ? `practice:${now.getTime()}:${Math.random().toString(36).slice(2)}` : `v2:${mode}:${date}`,
    mode, date, targetId: target.id, guesses: [], status: 'playing', assisted: false,
    generations: mode === 'kanto' ? [1] : mode === 'complete' ? allGenerations : validGenerations };
}

export function comparePokemon(guess: Pokemon, target: Pokemon): Feedback {
  const numeric = (a: number, b: number): Match => a === b ? 'correct' : a < b ? 'higher' : 'lower';
  const type = (slot: number): Match => {
    const a = guess.types[slot] ?? null, b = target.types[slot] ?? null;
    return a === b ? 'correct' : a && target.types.includes(a) ? 'partial' : 'wrong';
  };
  return { generation: numeric(guess.generation, target.generation), firstType: type(0), secondType: type(1), stage: numeric(guess.stage, target.stage) };
}

export function submitGuess(session: Session, id: number): Session {
  const pokemon = pokemonById.get(id);
  if (session.status !== 'playing' || session.guesses.length >= MAX_GUESSES || session.guesses.includes(id) || !pokemon || !session.generations.includes(pokemon.generation)) return session;
  const guesses = [...session.guesses, id];
  return { ...session, guesses, status: id === session.targetId ? 'won' : guesses.length === MAX_GUESSES ? 'lost' : 'playing' };
}

export function revealHint(session: Session, language: Language): Session {
  if (session.status !== 'playing' || session.guesses.length < 4 || session.assisted) return session;
  return { ...session, assisted: true, hintLanguage: language };
}

export function saveSession(progress: Progress, session: Session, now = new Date()): Progress {
  const results = [...progress.results];
  if (session.status !== 'playing' && !results.some(r => r.id === session.id)) {
    results.push({ id: session.id, mode: session.mode, date: session.date, targetId: session.targetId,
      won: session.status === 'won', attempts: session.guesses.length, assisted: session.assisted, completedAt: now.toISOString() });
  }
  return { ...progress, sessions: { ...progress.sessions, [session.mode]: session }, results };
}

export function getStats(progress: Progress, mode: Mode, today = utcDate()) {
  const results = progress.results.filter(r => r.mode === mode);
  const wins = results.filter(r => r.won);
  const dates = [...new Set(wins.map(r => r.date))].sort();
  let run = 0, best = 0;
  for (let i = 0; i < dates.length; i++) {
    run = i && Date.parse(dates[i]) - Date.parse(dates[i - 1]) === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const yesterday = utcDate(new Date(Date.parse(today) - 86400000));
  const current = dates.at(-1) === today || dates.at(-1) === yesterday ? run : 0;
  return { played: results.length, wins: wins.length, winRate: results.length ? Math.round(wins.length / results.length * 100) : 0,
    streak: mode === 'practice' ? 0 : current, best: mode === 'practice' ? 0 : best,
    assisted: wins.filter(r => r.assisted).length,
    distribution: Array.from({ length: 8 }, (_, i) => wins.filter(r => r.attempts === i + 1).length) };
}

export function captures(progress: Progress) {
  const map = new Map<number, { firstDate: string; count: number; assistedOnly: boolean }>();
  for (const result of progress.results.filter(r => r.won)) {
    const old = map.get(result.targetId);
    map.set(result.targetId, { firstDate: old?.firstDate ?? result.completedAt, count: (old?.count ?? 0) + 1, assistedOnly: (old?.assistedOnly ?? true) && result.assisted });
  }
  return map;
}

export function shareText(session: Session, language: Language, url: string): string {
  const title = session.mode === 'kanto' ? 'Daily Kanto' : session.mode === 'complete' ? (language === 'it' ? 'Daily Completa' : 'Daily Complete') : (language === 'it' ? 'Allenamento' : 'Training');
  const target = pokemonById.get(session.targetId)!;
  const emoji = (match: Match) => match === 'correct' ? '🟩' : match === 'partial' ? '🟨' : match === 'higher' ? '⬆️' : match === 'lower' ? '⬇️' : '⬜';
  const rows = session.guesses.map(id => Object.values(comparePokemon(pokemonById.get(id)!, target)).map(emoji).join('')).join('\n');
  return `Pokerdle · ${title}\n${session.date} · ${session.status === 'won' ? session.guesses.length : 'X'}/8${session.assisted ? (language === 'it' ? ' · con aiuto 💡' : ' · assisted 💡') : ''}\n\n${rows}\n\n${url}`;
}

export function emptyProgress(language: Language = 'en'): Progress {
  return { version: 2, language, sessions: {}, results: [] };
}

export function parseProgress(raw: string | null, fallback: Language): Progress {
  if (!raw) return emptyProgress(fallback);
  try {
    const value = JSON.parse(raw) as Progress;
    if (value.version !== 2 || !['it', 'en'].includes(value.language) || !value.sessions || !Array.isArray(value.results)) return emptyProgress(fallback);
    const modes: Mode[] = ['kanto', 'complete', 'practice'];
    for (const [mode, s] of Object.entries(value.sessions)) {
      if (!s || !modes.includes(mode as Mode) || s.mode !== mode || typeof s.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !pokemonById.has(s.targetId) || !Array.isArray(s.guesses) || s.guesses.length > 8 || new Set(s.guesses).size !== s.guesses.length || !s.guesses.every(id => pokemonById.has(id)) || !Array.isArray(s.generations) || !s.generations.length || !s.generations.every(g => allGenerations.includes(g)) || !['playing', 'won', 'lost'].includes(s.status) || typeof s.assisted !== 'boolean') return emptyProgress(fallback);
      const expected = s.guesses.at(-1) === s.targetId ? 'won' : s.guesses.length === 8 ? 'lost' : 'playing';
      if (s.status !== expected || s.guesses.slice(0, -1).includes(s.targetId)) return emptyProgress(fallback);
    }
    const resultIds = new Set<string>();
    for (const r of value.results) {
      if (!r || typeof r.id !== 'string' || resultIds.has(r.id) || !modes.includes(r.mode) || !pokemonById.has(r.targetId) || !Number.isInteger(r.attempts) || r.attempts < 1 || r.attempts > 8 || typeof r.won !== 'boolean' || typeof r.assisted !== 'boolean' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !Number.isFinite(Date.parse(r.completedAt))) return emptyProgress(fallback);
      resultIds.add(r.id);
    }
    return value;
  } catch { return emptyProgress(fallback); }
}
