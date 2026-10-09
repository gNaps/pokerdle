import { allGenerations, catalog, normalize, pokemonById, type Pokemon } from './game';

export const RECALL_STORAGE_KEY = 'pokerdle:recall:v1';
export const SPRINT_DURATION = 60_000;
export const generationPool = (generation: number) => catalog.filter(p => p.generation === generation);

export interface SprintSession {
  id: string; generation: number; startedAt: number; endsAt: number;
  found: number[]; status: 'playing' | 'finished';
}
export interface SprintRecord { best: number; played: number; lastScore: number }
export interface CompletionSession {
  generation: number; found: number[]; startedAt: number; finishedAt: number | null;
}
export interface RecallProgress {
  version: 1;
  sprintGeneration: number; sprint: SprintSession | null; records: Partial<Record<number, SprintRecord>>;
  completionRecords: Partial<Record<number, number>>;
}
export type RecallGuessStatus = 'accepted' | 'duplicate' | 'unknown' | 'outside' | 'ambiguous' | 'expired';
export interface RecallGuess { status: RecallGuessStatus; pokemon?: Pokemon }

export function emptyRecallProgress(): RecallProgress {
  return { version: 1, sprintGeneration: 1, sprint: null, records: {}, completionRecords: {} };
}

const names = new Map<string, Pokemon[]>();
for (const pokemon of catalog) {
  for (const name of new Set([pokemon.slug, pokemon.names.it, pokemon.names.en].map(normalize))) {
    names.set(name, [...(names.get(name) ?? []), pokemon]);
  }
}

export function evaluateRecallGuess(query: string, generation: number, found: number[]): RecallGuess {
  const needle = normalize(query);
  // The two Nidoran species need an explicit gender, also available as f/m on mobile.
  if (needle === 'nidoran') return { status: 'ambiguous' };
  const matches = needle ? names.get(needle) ?? [] : [];
  if (!matches.length) return { status: 'unknown' };
  if (matches.length > 1) return { status: 'ambiguous' };
  const pokemon = matches[0];
  if (pokemon.generation !== generation) return { status: 'outside' };
  return { status: found.includes(pokemon.id) ? 'duplicate' : 'accepted', pokemon };
}

export function createCompletionSession(generation: number, now = Date.now()): CompletionSession {
  if (!allGenerations.includes(generation)) throw new Error('Choose a valid generation');
  return { generation, found: [], startedAt: now, finishedAt: null };
}

export function submitCompletionGuess(session: CompletionSession, query: string, now = Date.now()) {
  const result = evaluateRecallGuess(query, session.generation, session.found);
  if (result.status !== 'accepted' || session.finishedAt !== null) return { result, session };
  const found = [...session.found, result.pokemon!.id];
  return { result, session: { ...session, found,
    finishedAt: found.length === generationPool(session.generation).length ? Math.max(session.startedAt, now) : null,
  } };
}

export function completionElapsed(session: CompletionSession, now = Date.now()) {
  return Math.max(0, (session.finishedAt ?? now) - session.startedAt);
}

export function formatCompletionTime(milliseconds: number) {
  const time = Math.max(0, Math.floor(milliseconds));
  const seconds = Math.floor(time / 1000);
  const parts = [Math.floor(seconds / 60) % 60, seconds % 60];
  if (seconds >= 3600) parts.unshift(Math.floor(seconds / 3600));
  return parts.map(value => String(value).padStart(2, '0')).join(':') + '.' + String(Math.floor(time % 1000 / 10)).padStart(2, '0');
}

export function saveCompletionRecord(progress: RecallProgress, session: CompletionSession): RecallProgress {
  const pool = generationPool(session.generation);
  if (session.finishedAt === null || !pool.length || new Set(session.found).size !== pool.length || !pool.every(p => session.found.includes(p.id))) return progress;
  const elapsed = completionElapsed(session);
  const previous = progress.completionRecords[session.generation];
  if (previous !== undefined && previous <= elapsed) return progress;
  return { ...progress, completionRecords: { ...progress.completionRecords, [session.generation]: elapsed } };
}

export function finishSprint(progress: RecallProgress, now = Date.now()): RecallProgress {
  const sprint = progress.sprint;
  if (!sprint || sprint.status === 'finished' || now < sprint.endsAt) return progress;
  const record = progress.records[sprint.generation];
  return { ...progress, sprint: { ...sprint, status: 'finished' }, records: {
    ...progress.records, [sprint.generation]: {
      best: Math.max(record?.best ?? 0, sprint.found.length), played: (record?.played ?? 0) + 1,
      lastScore: sprint.found.length,
    },
  } };
}

export function startSprint(progress: RecallProgress, now = Date.now()): RecallProgress {
  const current = finishSprint(progress, now);
  if (current.sprint?.status === 'playing') return current;
  return { ...current, sprint: {
    id: `sprint:${now}:${Math.random().toString(36).slice(2)}`, generation: current.sprintGeneration,
    startedAt: now, endsAt: now + SPRINT_DURATION, found: [], status: 'playing',
  } };
}

export function submitSprintGuess(progress: RecallProgress, query: string, now = Date.now()) {
  const current = finishSprint(progress, now);
  const sprint = current.sprint;
  if (!sprint || sprint.status !== 'playing') return { progress: current, result: { status: 'expired' } as RecallGuess };
  const result = evaluateRecallGuess(query, sprint.generation, sprint.found);
  return { result, progress: result.status === 'accepted' ? {
    ...current, sprint: { ...sprint, found: [...sprint.found, result.pokemon!.id] },
  } : current };
}

export function sprintSeconds(sprint: SprintSession, now = Date.now()) {
  return Math.max(0, Math.min(60, Math.ceil((sprint.endsAt - now) / 1000)));
}

export function parseRecallProgress(raw: string | null): RecallProgress {
  if (!raw) return emptyRecallProgress();
  try {
    const value = JSON.parse(raw) as RecallProgress;
    const validGeneration = (g: number) => allGenerations.includes(g);
    const validFound = (ids: unknown, g: number) => Array.isArray(ids) && new Set(ids).size === ids.length && ids.every(id => typeof id === 'number' && pokemonById.get(id)?.generation === g);
    const validMap = (map: unknown) => map !== null && typeof map === 'object' && !Array.isArray(map);
    if (value.version !== 1 || !validGeneration(value.sprintGeneration) || !validMap(value.records)) return emptyRecallProgress();
    const completionRecords = value.completionRecords === undefined ? {} : value.completionRecords;
    if (!validMap(completionRecords)) return emptyRecallProgress();
    for (const [key, duration] of Object.entries(completionRecords)) {
      if (String(Number(key)) !== key || !validGeneration(Number(key)) || !Number.isSafeInteger(duration) || duration! < 0) return emptyRecallProgress();
    }
    for (const [key, record] of Object.entries(value.records)) {
      if (String(Number(key)) !== key || !validGeneration(Number(key)) || !record || !Number.isInteger(record.played) || record.played < 1 || !Number.isInteger(record.best) || !Number.isInteger(record.lastScore) || record.lastScore < 0 || record.best < record.lastScore || record.best > generationPool(Number(key)).length) return emptyRecallProgress();
    }
    const s = value.sprint;
    if (s !== null && (!s || typeof s.id !== 'string' || !validGeneration(s.generation) || (s.generation !== value.sprintGeneration && s.status === 'playing') || !Number.isFinite(s.startedAt) || s.startedAt < 0 || !Number.isFinite(s.endsAt) || s.endsAt - s.startedAt !== SPRINT_DURATION || !validFound(s.found, s.generation) || !['playing', 'finished'].includes(s.status) || (s.status === 'finished' && !value.records[s.generation]))) return emptyRecallProgress();
    // Drop legacy completion saves while preserving Sprint sessions and records.
    return { version: 1, sprintGeneration: value.sprintGeneration, sprint: value.sprint, records: value.records, completionRecords };
  } catch { return emptyRecallProgress(); }
}
