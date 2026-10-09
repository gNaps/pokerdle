import { test, expect, type Page } from '@playwright/test';
import { emptyProgress, STORAGE_KEY } from '../../lib/game';
import { emptyRecallProgress, finishSprint, generationPool, RECALL_STORAGE_KEY, startSprint, submitSprintGuess, type RecallProgress } from '../../lib/recall';

async function seed(page: Page, recall: RecallProgress = emptyRecallProgress()) {
  await page.addInitScript(({ mainKey, main, recallKey, recall }) => {
    if (!localStorage.getItem(mainKey)) localStorage.setItem(mainKey, JSON.stringify(main));
    if (!localStorage.getItem(recallKey)) localStorage.setItem(recallKey, JSON.stringify(recall));
  }, { mainKey: STORAGE_KEY, main: emptyProgress('en'), recallKey: RECALL_STORAGE_KEY, recall });
}
async function name(page: Page, value: string) {
  await page.getByRole('textbox', { name: 'Pokémon name', exact: true }).fill(value);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
}
const generation = (page: Page, roman: string) => page.getByRole('button', { name: new RegExp(`^${roman} ·`) });

test('completion chooses a generation, renders every slot and clears answers on restart, generation change and reload', async ({ page }, testInfo) => {
  await seed(page); await page.goto('/completion');
  await expect(page.getByRole('textbox', { name: 'Pokémon name', exact: true })).toHaveCount(0);
  await generation(page, 'I').click();
  await expect(page.locator('.completion-slot')).toHaveCount(151);
  await expect(page.getByRole('article', { name: '#1 · Still a mystery', exact: true })).toContainText('???');
  await name(page, 'Pikachu');
  await expect(page.getByRole('article', { name: '#25 · Pikachu', exact: true })).toBeVisible();
  await name(page, 'Pikachu'); await expect(page.getByRole('status')).toContainText('already found');
  await name(page, 'Chikorita'); await expect(page.getByRole('status')).toContainText('another generation');
  await name(page, 'bulba'); await expect(page.getByRole('status')).toContainText('not recognized');
  await name(page, 'Mr Mime'); await expect(page.getByRole('article', { name: '#122 · Mr. Mime', exact: true })).toBeVisible();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  await generation(page, 'II').click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.completion-slot')).toHaveCount(100);
  await name(page, 'Chikorita');
  await generation(page, 'I').click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await name(page, 'Pikachu');
  await page.getByRole('button', { name: 'Restart this generation' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByRole('textbox', { name: 'Pokémon name', exact: true })).toHaveValue('');
  await name(page, 'Bulbasaur');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Pokémon name', exact: true })).toHaveCount(0);
  await expect(generation(page, 'I')).toHaveAttribute('aria-pressed', 'false');
  await generation(page, 'II').click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await name(page, 'Chikorita');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), RECALL_STORAGE_KEY)).toEqual(emptyRecallProgress());
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).results.length, STORAGE_KEY)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('completion.png') });
});

test('legacy completion saves are removed, Sprint records are preserved and leaving the page clears the round', async ({ page }) => {
  const recall = finishSprint(submitSprintGuess(startSprint(emptyRecallProgress(), 1000), 'Pikachu', 2000).progress, 61_000);
  await seed(page, { ...recall, completionGeneration: 2, completion: { 1: [25], 2: [152] } } as RecallProgress);
  await page.goto('/completion');
  await generation(page, 'I').click(); await name(page, 'Pikachu');
  await page.getByRole('link', { name: 'All modes' }).click();
  await page.getByRole('link', { name: 'Complete your Pokédex' }).click();
  await expect(page.getByRole('textbox', { name: 'Pokémon name', exact: true })).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), RECALL_STORAGE_KEY)).toEqual(recall);
});

test('sprint runs for 60 seconds, preserves the deadline across reload and records each round once', async ({ page }) => {
  await page.clock.install();
  await seed(page); await page.goto('/sprint');
  await expect(page.getByRole('timer')).toHaveText('60s');
  await expect(page.getByRole('textbox', { name: 'Pokémon name', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(generation(page, 'II')).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Pokémon name', exact: true })).toBeFocused();
  await name(page, 'Pikachu'); await name(page, 'Pikachu'); await name(page, 'Chikorita');
  await expect(page.getByTestId('sprint-score')).toHaveText('1');
  await page.clock.fastForward(30_000);
  await page.reload(); await expect(page.getByRole('timer')).toHaveText(/^(28|29|30)s$/);
  await name(page, 'Bulbasaur'); await expect(page.getByTestId('sprint-score')).toHaveText('2');
  await page.clock.fastForward(30_000);
  await expect(page.getByRole('heading', { name: 'Time’s up!' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Pokémon name', exact: true })).toHaveCount(0);
  await page.reload();
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), RECALL_STORAGE_KEY);
  expect(stored.records[1]).toEqual({ best: 2, played: 1, lastScore: 2 });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('sprint-score')).toHaveText('0');
  await page.clock.fastForward(60_000);
  await expect(page.getByRole('heading', { name: 'Time’s up!' })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records[1], RECALL_STORAGE_KEY)).toEqual({ best: 2, played: 2, lastScore: 0 });
});

test('sprint finishes after leaving the page and expired stored rounds cannot accept new answers', async ({ page }) => {
  const now = Date.now();
  const recall = submitSprintGuess(startSprint(emptyRecallProgress(), now), 'Pikachu', now).progress;
  await page.clock.install({ time: new Date(now) }); await seed(page, recall); await page.goto('/sprint');
  await expect(page.getByTestId('sprint-score')).toHaveText('1');
  await page.getByRole('link', { name: 'All modes' }).click();
  await page.clock.fastForward(65_000);
  await page.goto('/sprint');
  await expect(page.getByRole('heading', { name: 'Time’s up!' })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('00s');
  await expect(page.getByRole('textbox', { name: 'Pokémon name', exact: true })).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records[1].played, RECALL_STORAGE_KEY)).toBe(1);
});

test('memory modes appear on home and statistics, switch languages and fit narrow screens', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await seed(page); await page.goto('/');
  await expect(page.getByRole('link', { name: 'Complete your Pokédex' })).toHaveAttribute('href', '/completion');
  await expect(page.getByRole('link', { name: 'Play Sprint' })).toHaveAttribute('href', '/sprint');
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await page.getByRole('button', { name: 'Pokémon Sprint', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Your records');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Passa all’italiano' }).click();
  await page.goto('/completion');
  await expect(page.getByRole('heading', { name: 'Completa il Pokédex', exact: true }).first()).toBeVisible();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/completion', '/sprint']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
  await page.screenshot({ path: testInfo.outputPath('sprint.png') });
  expect(errors).toEqual([]);
});

test('recall works in memory when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await page.goto('/completion');
  await expect(page.locator('.storage-notice')).toBeVisible();
  await generation(page, 'I').click();
  const italian = await page.locator('html').getAttribute('lang') === 'it';
  await page.getByRole('textbox', { name: italian ? 'Nome del Pokémon' : 'Pokémon name', exact: true }).fill('Pikachu');
  await page.getByRole('button', { name: italian ? 'Inserisci' : 'Submit', exact: true }).click();
  await expect(page.getByRole('article', { name: '#25 · Pikachu', exact: true })).toBeVisible();
});

test('completion stopwatch stops on finishing, saves a per-generation best and resets rounds while preserving records', async ({ page }) => {
  test.setTimeout(60_000);
  const startedAt = Date.parse('2026-10-09T12:00:00Z');
  await page.clock.setFixedTime(new Date(startedAt));
  await seed(page, { ...emptyRecallProgress(), completionRecords: { 1: 90_000 } });
  await page.goto('/completion'); await generation(page, 'VI').click();
  await expect(page.getByRole('timer', { name: 'Elapsed time' })).toHaveText('00:00.00');
  await expect(page.getByTestId('completion-best')).toHaveText('—');
  const pool = generationPool(6);
  const input = page.getByRole('textbox', { name: 'Pokémon name', exact: true });
  for (const pokemon of pool.slice(0, -1)) {
    await input.fill(pokemon.names.en); await input.press('Enter');
  }
  await page.clock.setFixedTime(new Date(startedAt + 12_500));
  await expect(page.getByRole('timer', { name: 'Elapsed time' })).toHaveText('00:12.50');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completionRecords, RECALL_STORAGE_KEY)).toEqual({ 1: 90_000 });
  await input.fill(pool.at(-1)!.names.en); await input.press('Enter');
  await expect(page.getByRole('heading', { name: 'Generation complete!' })).toBeVisible();
  await expect(page.getByTestId('completion-best')).toHaveText('00:12.50');
  await page.clock.setFixedTime(new Date(startedAt + 600_000));
  await expect(page.getByRole('timer', { name: 'Elapsed time' })).toHaveText('00:12.50');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completionRecords, RECALL_STORAGE_KEY)).toEqual({ 1: 90_000, 6: 12_500 });
  await page.getByRole('button', { name: 'Restart this generation' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByRole('timer', { name: 'Elapsed time' })).toHaveText('00:00.00');
  await expect(page.getByTestId('completion-best')).toHaveText('00:12.50');
  await page.reload(); await generation(page, 'VI').click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByTestId('completion-best')).toHaveText('00:12.50');
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await page.getByRole('button', { name: 'Complete the Pokédex', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('00:12.50');
  await page.keyboard.press('Escape');
  await generation(page, 'I').click();
  await expect(page.getByTestId('completion-best')).toHaveText('01:30.00');
});
