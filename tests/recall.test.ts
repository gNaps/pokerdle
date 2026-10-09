import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completionElapsed, createCompletionSession, emptyRecallProgress, evaluateRecallGuess, finishSprint, formatCompletionTime, generationPool, parseRecallProgress, saveCompletionRecord, sprintSeconds, SPRINT_DURATION, startSprint, submitCompletionGuess, submitSprintGuess } from '../lib/recall';

test('recall requires a complete name, normalizes spelling and distinguishes the two Nidoran', () => {
  for (const [name, generation, id] of [['  BULBASAUR  ', 1, 1], ['Mr Mime', 1, 122], ['Farfetchd', 1, 83], ['Nidoran-f', 1, 29], ['Nidoran♂', 1, 32], ['Flabebe', 6, 669], ['Type Null', 7, 772]] as const) {
    const result = evaluateRecallGuess(name, generation, []);
    assert.equal(result.status, 'accepted'); assert.equal(result.pokemon?.id, id);
  }
  for (const name of ['bulba', '25', '', '   ', 'not a Pokémon']) assert.equal(evaluateRecallGuess(name, 1, []).status, 'unknown');
  assert.equal(evaluateRecallGuess('Nidoran', 1, []).status, 'ambiguous');
  assert.equal(evaluateRecallGuess('Chikorita', 1, []).status, 'outside');
  assert.equal(evaluateRecallGuess('Pikachu', 1, [25]).status, 'duplicate');
});

test('completion accepts free-order guesses and changing generation creates an empty session', () => {
  let session = createCompletionSession(1);
  session = submitCompletionGuess(session, 'Pikachu').session;
  session = submitCompletionGuess(session, 'Bulbasaur').session;
  assert.deepEqual(session.found, [25, 1]);
  assert.equal(submitCompletionGuess(session, 'Pikachu').session, session);
  assert.equal(submitCompletionGuess(session, 'Chikorita').session, session);
  session = createCompletionSession(2);
  assert.deepEqual(session.found, []);
  session = submitCompletionGuess(session, 'Chikorita').session;
  assert.deepEqual(session.found, [152]);
  session = createCompletionSession(1);
  assert.deepEqual(session.found, []);
  assert.throws(() => createCompletionSession(9));
  assert.deepEqual(generationPool(2).map(p => p.id), Array.from({ length: 100 }, (_, index) => 152 + index));
});

test('a generation can be completed and restarting clears all guesses', () => {
  let session = createCompletionSession(1);
  for (const pokemon of generationPool(1)) session = submitCompletionGuess(session, pokemon.names.en).session;
  assert.equal(session.found.length, 151);
  session = createCompletionSession(1);
  assert.deepEqual(session.found, []);
  assert.equal(submitCompletionGuess(session, 'Bulbasaur').result.status, 'accepted');
});

test('sprint starts explicitly, gives one point per unique valid name and runs for exactly 60 seconds', () => {
  const before = emptyRecallProgress();
  assert.equal(submitSprintGuess(before, 'Pikachu', 1000).result.status, 'expired');
  let progress = startSprint(before, 1000);
  assert.equal(progress.sprint?.endsAt, 1000 + SPRINT_DURATION);
  assert.equal(startSprint(progress, 2000), progress);
  progress = submitSprintGuess(progress, 'Pikachu', 2000).progress;
  for (const name of ['Pikachu', 'wrong', 'Chikorita']) assert.equal(submitSprintGuess(progress, name, 3000).progress, progress);
  assert.deepEqual(progress.sprint?.found, [25]);
  assert.equal(sprintSeconds(progress.sprint!, 1000), 60);
  assert.equal(sprintSeconds(progress.sprint!, 60_999), 1);
  assert.equal(sprintSeconds(progress.sprint!, 61_000), 0);
  assert.equal(sprintSeconds(progress.sprint!, 70_000), 0);
});

test('deadline rejects late guesses, finishes zero-score rounds and records completion once', () => {
  let progress = startSprint(emptyRecallProgress(), 1000);
  progress = submitSprintGuess(progress, 'Bulbasaur', 60_999).progress;
  const late = submitSprintGuess(progress, 'Pikachu', 61_000);
  assert.equal(late.result.status, 'expired');
  assert.deepEqual(late.progress.sprint?.found, [1]);
  assert.equal(late.progress.sprint?.status, 'finished');
  assert.deepEqual(late.progress.records[1], { best: 1, played: 1, lastScore: 1 });
  assert.equal(finishSprint(late.progress, 80_000), late.progress);
  const zero = finishSprint(startSprint(late.progress, 90_000), 150_000);
  assert.deepEqual(zero.records[1], { best: 1, played: 2, lastScore: 0 });
});

test('reload restores the deadline and expired rounds finish without replaying or losing records', () => {
  let progress = startSprint(emptyRecallProgress(), 1000);
  progress = submitSprintGuess(progress, 'Pikachu', 2000).progress;
  const restored = parseRecallProgress(JSON.stringify(progress));
  assert.equal(restored.sprint?.endsAt, 61_000);
  assert.equal(sprintSeconds(restored.sprint!, 31_000), 30);
  const finished = finishSprint(restored, 70_000);
  assert.equal(finished.records[1]?.played, 1);
  assert.deepEqual(parseRecallProgress(JSON.stringify(finished)), finished);
  let gen2 = startSprint({ ...finished, sprintGeneration: 2 }, 80_000);
  gen2 = submitSprintGuess(gen2, 'Chikorita', 81_000).progress;
  gen2 = submitSprintGuess(gen2, 'Bayleef', 82_000).progress;
  gen2 = finishSprint(gen2, 140_000);
  assert.deepEqual(gen2.records[2], { best: 2, played: 1, lastScore: 2 });
  assert.deepEqual(gen2.records[1], { best: 1, played: 1, lastScore: 1 });
});

test('invalid recall storage is isolated and rejected, including duplicates, mixed pools and invalid timers', () => {
  const empty = emptyRecallProgress();
  for (const raw of ['{invalid', 'null', '[]', JSON.stringify({ ...empty, version: 2 }), JSON.stringify({ ...empty, records: { 1: { played: 1, best: -1, lastScore: 0 } } }), JSON.stringify({ ...empty, sprintGeneration: 9 })]) {
    assert.deepEqual(parseRecallProgress(raw), empty);
  }
  const active = startSprint(empty, 1000);
  assert.deepEqual(parseRecallProgress(JSON.stringify({ ...active, sprint: { ...active.sprint, endsAt: 100_000 } })), empty);
  assert.deepEqual(parseRecallProgress(JSON.stringify({ ...active, sprint: { ...active.sprint, found: [1, 1] } })), empty);
});

test('legacy completion saves are discarded while Sprint records and sessions survive', () => {
  let progress = startSprint(emptyRecallProgress(), 1000);
  progress = submitSprintGuess(progress, 'Pikachu', 2000).progress;
  progress = finishSprint(progress, 61_000);
  const legacy = { ...progress, completionGeneration: 2, completion: { 1: [25], 2: [152] } };
  assert.deepEqual(parseRecallProgress(JSON.stringify(legacy)), progress);
  assert.ok(!('completion' in parseRecallProgress(JSON.stringify(legacy))));
});

test('completion stopwatch starts with the generation, includes idle time and stops at the last correct name', () => {
  let session = createCompletionSession(6, 1000);
  assert.equal(completionElapsed(session, 16_000), 15_000);
  session = submitCompletionGuess(session, 'Chespin', 16_000).session;
  assert.equal(session.startedAt, 1000); assert.equal(session.finishedAt, null);
  for (const pokemon of generationPool(6)) session = submitCompletionGuess(session, pokemon.names.en, 121_000).session;
  assert.equal(session.finishedAt, 121_000);
  assert.equal(completionElapsed(session, 180_000), 120_000);
  assert.equal(submitCompletionGuess(session, 'Chespin', 180_000).session, session);
  const restarted = createCompletionSession(6, 180_000);
  assert.deepEqual(restarted.found, []); assert.equal(completionElapsed(restarted, 180_000), 0);
});

test('only completed generations save a best time, with faster times winning and ties preserving it', () => {
  const finished = (generation: number, duration: number) => {
    let session = createCompletionSession(generation, 1000);
    for (const pokemon of generationPool(generation)) session = submitCompletionGuess(session, pokemon.names.en, 1000 + duration).session;
    return session;
  };
  let progress = emptyRecallProgress();
  const partial = submitCompletionGuess(createCompletionSession(1, 1000), 'Bulbasaur', 2000).session;
  assert.equal(saveCompletionRecord(progress, partial), progress);
  progress = saveCompletionRecord(progress, finished(1, 120_000));
  assert.equal(progress.completionRecords[1], 120_000);
  assert.equal(saveCompletionRecord(progress, finished(1, 130_000)), progress);
  assert.equal(saveCompletionRecord(progress, finished(1, 120_000)), progress);
  progress = saveCompletionRecord(progress, finished(1, 100_000));
  progress = saveCompletionRecord(progress, finished(2, 90_000));
  assert.deepEqual(progress.completionRecords, { 1: 100_000, 2: 90_000 });
  assert.deepEqual(parseRecallProgress(JSON.stringify(progress)), progress);
  assert.equal(saveCompletionRecord(progress, { ...partial, finishedAt: 2000 }), progress);
});

test('completion records migrate from old saves and invalid record times are rejected', () => {
  const progress = finishSprint(startSprint(emptyRecallProgress(), 1000), 61_000);
  const { completionRecords: _, ...old } = progress;
  assert.deepEqual(parseRecallProgress(JSON.stringify(old)), progress);
  for (const records of [{ 1: -1 }, { 1: 12.5 }, { 9: 1000 }, { 1: '1000' }]) {
    assert.deepEqual(parseRecallProgress(JSON.stringify({ ...progress, completionRecords: records })), emptyRecallProgress());
  }
  assert.equal(formatCompletionTime(0), '00:00.00');
  assert.equal(formatCompletionTime(61_995), '01:01.99');
  assert.equal(formatCompletionTime(3_600_120), '01:00:00.12');
});
