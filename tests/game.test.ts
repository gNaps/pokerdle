import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captures, catalog, comparePokemon, createSession, dailyTarget, emptyProgress, getStats, parseProgress, pokemonById, revealHint, saveSession, searchPokemon, shareText, submitGuess, utcDate, type Session } from '../lib/game';

const p = (id: number) => pokemonById.get(id)!;
const session = (targetId = 25): Session => ({ ...createSession('complete', undefined, undefined, new Date('2026-10-08T12:00:00Z')), targetId });

test('catalog has stable species ids, localized names and correct branched evolution stages', () => {
  assert.equal(catalog.length, 898);
  assert.equal(new Set(catalog.map(p => p.id)).size, 898);
  for (const pokemon of catalog) {
    assert.ok(pokemon.names.it && pokemon.names.en);
    assert.ok(pokemon.generation >= 1 && pokemon.generation <= 8);
    assert.ok(pokemon.types.length >= 1 && pokemon.types.length <= 2);
    assert.ok(pokemon.stage >= 1 && pokemon.stage <= 3);
  }
  assert.equal(p(133).stage, 1); // Eevee
  for (const id of [134, 135, 136, 196, 197, 470, 471, 700]) assert.equal(p(id).stage, 2);
  assert.equal(p(62).stage, 3); assert.equal(p(186).stage, 3); // Poliwrath, Politoed
  assert.equal(p(3).stage, 3); assert.equal(p(25).stage, 2); // Pichu → Pikachu
});

test('daily is deterministic, restricted to the right pool and never repeats on adjacent days', () => {
  for (const mode of ['kanto', 'complete'] as const) {
    let previous = -1;
    for (let i = 0; i < 1000; i++) {
      const date = utcDate(new Date(Date.UTC(2026, 0, 1 + i)));
      const target = dailyTarget(mode, date);
      assert.equal(target.id, dailyTarget(mode, date).id);
      assert.notEqual(target.id, previous);
      if (mode === 'kanto') assert.ok(target.id <= 151);
      previous = target.id;
    }
  }
  assert.equal(utcDate(new Date('2026-10-09T00:30:00+02:00')), '2026-10-08');
});

test('type feedback handles swapped slots, shared types and missing secondary types', () => {
  assert.equal(comparePokemon(p(1), p(1)).secondType, 'correct');
  assert.equal(comparePokemon(p(4), p(7)).secondType, 'correct');
  assert.equal(comparePokemon(p(4), p(1)).secondType, 'wrong');
  assert.equal(comparePokemon(p(1), p(4)).secondType, 'wrong');
  const swapped = { ...p(1), types: ['poison', 'grass'] };
  assert.equal(comparePokemon(swapped, p(1)).firstType, 'partial');
  assert.equal(comparePokemon(swapped, p(1)).secondType, 'partial');
  assert.equal(comparePokemon(p(4), p(6)).firstType, 'correct');
});

test('arrows point toward the target generation and stage', () => {
  assert.equal(comparePokemon(p(1), p(898)).generation, 'higher');
  assert.equal(comparePokemon(p(898), p(1)).generation, 'lower');
  assert.equal(comparePokemon(p(1), p(3)).stage, 'higher');
  assert.equal(comparePokemon(p(3), p(1)).stage, 'lower');
});

test('first and eighth guesses can win, eight wrong guesses lose and concluded games are locked', () => {
  const first = submitGuess(session(), 25);
  assert.equal(first.status, 'won'); assert.equal(first.guesses.length, 1);
  assert.equal(submitGuess(first, 4), first);
  let eighth = session();
  for (const id of [1, 2, 3, 4, 5, 6, 7]) eighth = submitGuess(eighth, id);
  assert.equal(eighth.status, 'playing');
  eighth = submitGuess(eighth, 25);
  assert.equal(eighth.status, 'won'); assert.equal(eighth.guesses.length, 8);
  let lost = session();
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) lost = submitGuess(lost, id);
  assert.equal(lost.status, 'lost'); assert.equal(submitGuess(lost, 25), lost);
});

test('duplicates, unknown ids and guesses outside training generations consume no guesses', () => {
  let s = submitGuess(session(), 1);
  assert.equal(submitGuess(s, 1), s); assert.equal(submitGuess(s, 9999), s);
  s = createSession('practice', [1]);
  assert.equal(submitGuess(s, 898), s);
  assert.throws(() => createSession('practice', []));
  for (let i = 0; i < 100; i++) {
    const next = createSession('practice', [2], 152);
    assert.equal(p(next.targetId).generation, 2); assert.notEqual(next.targetId, 152);
  }
});

test('hint only unlocks after four misses, preserves guesses and pins the name language', () => {
  let s = session();
  assert.equal(revealHint(s, 'it'), s);
  for (const id of [1, 2, 3, 4]) s = submitGuess(s, id);
  const hint = revealHint(s, 'it');
  assert.equal(hint.assisted, true); assert.equal(hint.hintLanguage, 'it'); assert.equal(hint.guesses.length, 4);
  assert.equal(revealHint(hint, 'en'), hint);
  assert.equal(revealHint(submitGuess(s, 25), 'it').assisted, false);
});

test('progress round trips, records a result once and rejects corrupt storage', () => {
  const won = submitGuess(session(), 25);
  let progress = saveSession(emptyProgress('it'), won);
  progress = saveSession(progress, won);
  assert.equal(progress.results.length, 1);
  assert.deepEqual(parseProgress(JSON.stringify(progress), 'en'), progress);
  assert.deepEqual(parseProgress('{invalid', 'it'), emptyProgress('it'));
  assert.deepEqual(parseProgress(JSON.stringify({ ...progress, version: 1 }), 'en'), emptyProgress('en'));
  assert.deepEqual(parseProgress(JSON.stringify({ ...progress, sessions: { complete: { ...won, guesses: [25, 25] } } }), 'en'), emptyProgress('en'));
});

test('streaks and distributions are separate for each daily; assisted wins count', () => {
  let progress = emptyProgress();
  for (const date of ['2026-10-05', '2026-10-06', '2026-10-08']) {
    const s = { ...session(), id: `complete:${date}`, date, assisted: true };
    progress = saveSession(progress, submitGuess(s, 25));
  }
  const stats = getStats(progress, 'complete', '2026-10-08');
  assert.equal(stats.streak, 1); assert.equal(stats.best, 2); assert.equal(stats.assisted, 3);
  assert.equal(stats.distribution[0], 3); assert.equal(stats.winRate, 100);
  assert.equal(getStats(progress, 'kanto', '2026-10-08').played, 0);
  assert.equal(getStats(progress, 'complete', '2026-10-09').streak, 1);
  assert.equal(getStats(progress, 'complete', '2026-10-10').streak, 0);
  assert.equal(getStats(progress, 'practice').streak, 0);
});

test('collection records count, first catch and whether all wins were assisted', () => {
  const date = new Date('2026-10-08T13:00:00Z');
  let progress = saveSession(emptyProgress(), { ...submitGuess(session(), 25), assisted: true }, date);
  assert.equal(captures(progress).get(25)?.assistedOnly, true);
  progress = saveSession(progress, { ...submitGuess(session(), 25), id: 'another-game' }, new Date('2026-10-09T13:00:00Z'));
  assert.deepEqual(captures(progress).get(25), { firstDate: date.toISOString(), count: 2, assistedOnly: false });
});

test('search normalizes punctuation, accents and gender symbols and supports aliases', () => {
  assert.equal(searchPokemon('mr mime')[0].id, 122);
  assert.equal(searchPokemon('Nidoran♀')[0].id, 29);
  assert.equal(searchPokemon('nidoran-m')[0].id, 32);
  assert.equal(searchPokemon('Flabébé')[0].id, 669);
  assert.equal(searchPokemon('Type: Null')[0].id, 772);
  assert.equal(searchPokemon('')[0], undefined);
});

test('shared result includes mode/date/hint but never reveals guessed or target names', () => {
  let s = session();
  for (const id of [1, 2, 3, 4]) s = submitGuess(s, id);
  s = submitGuess(revealHint(s, 'it'), 25);
  const text = shareText(s, 'it', 'https://example.com/classic');
  assert.ok(text.includes('5/8')); assert.ok(text.includes('con aiuto')); assert.ok(text.includes(s.date));
  assert.ok(!text.includes('Pikachu')); assert.ok(!text.includes('Bulbasaur'));
});
