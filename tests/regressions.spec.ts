import { test, expect, type Page } from '@playwright/test';
import axe from 'axe-core';

async function seriousAxeViolations(page: Page) {
  await page.evaluate(axe.source);
  const result = await page.evaluate(async () => (window as typeof window & { axe: typeof axe }).axe.run());
  return result.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
}

test('fresh phone and desktop screens name the job, audience, and first action before scrolling', async ({ browser }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveTitle('Quiet Loop — Review a finite language set');
    await expect(page.getByRole('heading', { level: 1, name: 'Review a small language set' })).toBeVisible();
    await expect(page.getByText('For adult language learners who want a short routine without streaks or an endless queue.')).toBeVisible();
    const action = page.getByRole('link', { name: 'Try it with sample data' });
    await expect(action).toBeVisible();
    const box = await action.boundingBox();
    expect(box && box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await context.close();
  }
});

test('unrelated clicks preserve theme, purchase disclosure, and dialog state', async ({ page }) => {
  await page.goto('/shelf');
  await page.getByText('Restore a purchase').click();
  await expect(page.locator('details')).toHaveJSProperty('open', true);
  await page.getByRole('heading', { name: 'Write a weekly reflection' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
  await expect(page.locator('details')).toHaveJSProperty('open', true);

  await page.goto('/demo');
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Archive card' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Archive card' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
});

test('notice expiry preserves typed text and an open archive dialog', async ({ page }) => {
  await page.goto('/cards');
  await page.locator('#card-front').fill('Toast source');
  await page.locator('#card-back').fill('Saved answer');
  await page.getByRole('button', { name: 'Add card' }).click();
  await page.locator('#card-front').fill('Unsaved work');
  await page.getByRole('button', { name: 'Archive Toast source' }).click();
  await page.waitForTimeout(4800);
  await expect(page.locator('#card-front')).toHaveValue('Unsaved work');
  await expect(page.getByRole('dialog', { name: 'Archive this card?' })).toBeVisible();
});

test('invalid structured imports are rejected without changing sample cards', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/demo?view=about');
  const invalid = Buffer.from(JSON.stringify({
    version: 1,
    cards: [{ id: 'bad', front: 42, back: 'answer', language: '', note: '', dueOn: '2026-09-05', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
    settings: { dailyLimit: 7, weeklyPlan: false, theme: 'system' },
    reflections: [],
    sessions: []
  }));
  await page.locator('#import-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: invalid });
  await expect(page.getByText('This is not a valid Quiet Loop JSON backup. Choose an unedited Quiet Loop export.')).toBeVisible();
  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await expect(page.locator('.card-list').first().getByRole('listitem')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('an invalid license never grants weekly reflections', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/calm-language-routine/verify?*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ valid: false, reason: 'invalid', expires_at: null })
  }));
  await page.goto('/shelf');
  await page.getByText('Restore a purchase').click();
  await page.getByLabel('License token').fill('invalid-token');
  await page.getByRole('button', { name: 'Restore purchase' }).click();
  await expect(page.getByText('That license is not active. Check the token or buy a new license.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'What do you want to remember?' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('sb_license:calm-language-routine'))).toBeNull();
});

test('whitespace-only cards stay unsaved and explain the correction', async ({ page }) => {
  await page.goto('/cards');
  await page.locator('#card-front').fill('   \n ');
  await page.locator('#card-back').fill('   ');
  await page.locator('#card-form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.getByText('Enter a prompt with at least one visible character.')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Active cards/ })).toContainText('0');
});

test('dark review and archive states have no serious accessibility violations', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Archive card' }).click();
  expect(await seriousAxeViolations(page)).toEqual([]);
});

test('keyboard focus, reduced motion, zoom, and mobile touch targets remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main h1')).toBeFocused();
  await page.getByRole('link', { name: 'Cards', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Add and update language cards' })).toBeFocused();
  const transition = await page.locator('.button').first().evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Math.max(...transition.split(',').map((value) => Number.parseFloat(value)))).toBeLessThanOrEqual(0.00001);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  for (const locator of [page.locator('.wordmark'), page.getByRole('link', { name: 'Privacy' }), page.getByRole('link', { name: 'Terms' })]) {
    const box = await locator.boundingBox();
    expect(box && box.height).toBeGreaterThanOrEqual(44);
  }
});

test('route history, legal pages, and designed 404 have correct titles and structure', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await expect(page).toHaveTitle('Cards — Quiet Loop');
  await page.goBack();
  await expect(page).toHaveTitle('Quiet Loop — Review a finite language set');
  for (const [route, title] of [['/demo', 'Demo — Quiet Loop'], ['/plan', 'Daily limit — Quiet Loop'], ['/shelf', 'Weekly reflections — Quiet Loop'], ['/about', 'Data controls — Quiet Loop']]) {
    await page.goto(route);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('main h1')).toHaveCount(1);
  }
  for (const [route, title] of [['/privacy/', 'Privacy — Quiet Loop'], ['/terms/', 'Terms — Quiet Loop']]) {
    await page.goto(route);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('footer')).toBeVisible();
  }
  expect(errors).toEqual([]);
  const response = await page.goto('/missing-page');
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle('Page not found — Quiet Loop');
  await expect(page.getByRole('heading', { level: 1, name: 'This page does not exist' })).toBeVisible();
});

test('the pointer-operable update control activates a waiting service worker', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload({ waitUntil: 'networkidle' });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.evaluate(async () => {
    await fetch('/__test/service-worker-update', { method: 'POST' });
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  const update = page.getByRole('button', { name: 'Update available. Reload now' });
  await expect(update).toBeVisible();
  await expect(update).toHaveCSS('pointer-events', 'auto');
  await Promise.all([page.waitForEvent('load'), update.click()]);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some((key) => key.includes('test-1')))).toBe(true);
});
