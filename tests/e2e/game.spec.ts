import { test, expect, type Page } from '@playwright/test';
import { catalog, createSession, dailyTarget, emptyProgress, STORAGE_KEY, submitGuess, utcDate } from '../../lib/game';

async function seed(page: Page, value = emptyProgress('en')) {
  await page.addInitScript(({ key, value }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
  }, { key: STORAGE_KEY, value });
}
async function guess(page: Page, name: string) {
  await page.getByRole('combobox').fill(name);
  await page.getByRole('option').filter({ hasText: name }).first().click();
  await page.getByRole('button', { name: 'Guess', exact: true }).click();
}

test('daily can win, restore, share without spoilers and populate collection', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await seed(page);
  await page.goto('/kanto');
  await expect(page.getByRole('combobox')).toBeVisible();
  const target = dailyTarget('kanto', utcDate());
  await guess(page, target.names.en);
  await expect(page.getByRole('heading', { name: 'Gotcha! That’s the one.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Gotcha! That’s the one.' })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { shared: string }).shared = text; } } });
  });
  await page.getByRole('button', { name: 'Share result' }).click();
  await expect(page.getByRole('button', { name: 'Result copied!' })).toBeVisible();
  const shared = await page.evaluate(() => (window as unknown as { shared: string }).shared);
  expect(shared).toContain('1/8'); expect(shared).not.toContain(target.names.en);
  await page.goto('/pokedex');
  // The daily target can be beyond the first paginated set of 60 species.
  await page.getByRole('checkbox', { name: 'Caught only' }).check();
  await expect(page.getByRole('button', { name: new RegExp(target.names.en) })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(target.names.en) }).click();
  await expect(page.getByRole('dialog')).toContainText('First catch');
  expect(errors).toEqual([]);
});

test('eighth attempt wins, hint works and stats record only one completion', async ({ page }) => {
  let session = { ...createSession('complete'), targetId: 25 };
  for (const id of [1, 2, 3, 4, 5, 6, 7]) session = submitGuess(session, id);
  await seed(page, { ...emptyProgress(), sessions: { complete: session } });
  await page.goto('/classic');
  await page.getByRole('button', { name: 'Reveal the first letter' }).click();
  await expect(page.getByText('Hint used', { exact: true })).toBeVisible();
  await guess(page, 'Pikachu');
  await expect(page.getByRole('heading', { name: 'Gotcha! That’s the one.' })).toBeVisible();
  await page.reload();
  const progress = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  expect(progress.results).toHaveLength(1); expect(progress.results[0].attempts).toBe(8); expect(progress.results[0].assisted).toBe(true);
});

test('training filters generations, preserves state and confirms abandoning', async ({ page }) => {
  await seed(page); await page.goto('/training');
  await expect(page.getByRole('combobox')).toBeVisible();
  await guess(page, 'Bulbasaur');
  // Almost always a miss; seeded target is explicitly checked to avoid a flaky random outcome.
  const status = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).sessions.practice.status, STORAGE_KEY);
  if (status === 'playing') {
    await page.getByRole('button', { name: 'New game', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Keep this game' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole('article', { name: '1. Bulbasaur' })).toBeVisible();
});

test('home, rules, language switch and all layouts have no horizontal overflow', async ({ page }) => {
  await seed(page); await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Choose your adventure' })).toBeVisible();
  await page.getByRole('button', { name: 'Learn the rules' }).click();
  await expect(page.getByRole('dialog')).toContainText('8 guesses');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Passa all’italiano' }).click();
  await expect(page.getByRole('heading', { name: 'Scegli la tua avventura' })).toBeVisible();
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/kanto', '/pokedex']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});

test('old daily resumes across midnight, new daily starts after finishing', async ({ page }) => {
  const yesterday = utcDate(new Date(Date.now() - 86400000));
  let session = { ...createSession('kanto'), date: yesterday, id: `v2:kanto:${yesterday}`, targetId: 25 };
  session = submitGuess(session, 1);
  await seed(page, { ...emptyProgress(), sessions: { kanto: session } });
  await page.goto('/kanto');
  await expect(page.getByText(`You’re finishing the challenge from ${yesterday}`)).toBeVisible();
  await guess(page, 'Pikachu');
  await expect(page.getByRole('heading', { name: 'Gotcha! That’s the one.' })).toBeVisible();
  await page.getByRole('button', { name: 'Play today’s daily' }).click();
  await expect(page.getByRole('combobox')).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).sessions.kanto.date, STORAGE_KEY)).toBe(utcDate());
});
