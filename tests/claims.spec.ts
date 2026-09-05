import { test, expect, type Browser, type Page } from '@playwright/test';

async function addCard(page: Page, front: string, back: string): Promise<void> {
  await page.locator('#card-front').fill(front);
  await page.locator('#card-back').fill(back);
  await page.getByRole('button', { name: 'Add card' }).click();
  await expect(page.getByText(front, { exact: true })).toBeVisible();
}

test('@claim:demo-sandbox sample data is one click away and cannot change real cards', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('How do I ask for the bill?')).toBeVisible();

  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Archive card' }).click();
  await page.locator('#archive-reason').selectOption('Already familiar');
  await page.getByRole('dialog').getByRole('button', { name: 'Archive card' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('How do I ask for the bill?')).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Review a small language set' })).toBeVisible();

  await page.goto('/cards');
  await addCard(page, 'My real card', 'My real answer');
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Review tomorrow' }).click();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await expect(page.getByText('My real card', { exact: true })).toBeVisible();
  await expect(page.getByText('How do I ask for the bill?', { exact: true })).toHaveCount(0);
});

test('@claim:bounded-daily-set a started review keeps the chosen limit', async ({ page }) => {
  await page.goto('/plan');
  await page.locator('#daily-limit').fill('2');
  await expect(page.locator('#limit-output')).toHaveText('2 cards');
  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await addCard(page, 'First due card', 'First answer');
  await addCard(page, 'Second due card', 'Second answer');
  await addCard(page, 'Third due card', 'Third answer');
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: 'Start today’s review' }).click();
  await expect(page.getByLabel('Card 1 of 2')).toBeVisible();

  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await addCard(page, 'Added after review start', 'Later answer');
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page.getByLabel('Card 1 of 2')).toBeVisible();
});

test('@claim:device-local core study data persists without third-party requests', async ({ page }) => {
  const outsideRequests: string[] = [];
  const expectedOrigin = new URL(process.env.QUIET_LOOP_URL || 'http://127.0.0.1:4173').origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.origin !== expectedOrigin) outsideRequests.push(request.url());
  });
  await page.goto('/cards');
  await addCard(page, 'A private card', 'A private answer');
  await page.reload();
  await expect(page.getByText('A private card', { exact: true })).toBeVisible();
  expect(outsideRequests).toEqual([]);
});

test('@claim:offline-reload cached demo reloads in its own browser context', async ({ browser }: { browser: Browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
  const page = await context.newPage();
  await page.goto('/demo', { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload({ waitUntil: 'networkidle' });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('How do I ask for the bill?')).toBeVisible();
  await expect(page.getByText('You are offline. Saved cards are still available.')).toBeVisible();
  await context.close();
});

test('@claim:csv-export CSV contains every sample card and its fields', async ({ page }) => {
  await page.goto('/demo?view=cards');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = '';
  for await (const chunk of stream) csv += chunk.toString();
  const lines = csv.trim().split('\n');
  expect(lines).toHaveLength(6);
  expect(lines[0]).toBe('front,back,language,note,dueOn,status,archiveReason,createdAt');
  expect(csv).toContain('"How do I ask for the bill?"');
  expect(csv).toContain('"¿Me trae la cuenta, por favor?"');
});

test('@claim:json-backup JSON export restores cards, settings, sessions, and reflections', async ({ page }) => {
  await page.goto('/demo?view=about');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON backup' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const content = Buffer.concat(chunks);
  const parsed = JSON.parse(content.toString());
  expect(parsed.cards).toHaveLength(5);
  expect(parsed.settings.dailyLimit).toBe(4);
  expect(parsed.sessions).toHaveLength(1);
  expect(parsed.reflections).toHaveLength(1);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete all local data' }).click();
  await page.getByRole('link', { name: 'Data controls' }).click();
  await page.locator('#import-file').setInputFiles({ name: 'quiet-loop.json', mimeType: 'application/json', buffer: content });
  await expect(page.getByText('JSON backup imported.')).toBeVisible();
  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await expect(page.locator('.card-list').first().getByRole('listitem')).toHaveCount(5);
});

test('@claim:archive-restore a reason is required and an archived card can return', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Archive card' }).click();
  const dialog = page.getByRole('dialog', { name: 'Archive this card?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Archive card' }).click();
  await expect(dialog).toBeVisible();
  await expect(page.locator('#archive-reason')).toBeFocused();
  await page.locator('#archive-reason').selectOption('No longer relevant');
  await dialog.getByRole('button', { name: 'Archive card' }).click();
  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await expect(page.getByText('Reason: No longer relevant')).toBeVisible();
  await page.getByRole('button', { name: 'Restore card' }).click();
  await expect(page.getByText('Card restored and due today.')).toBeVisible();
  await expect(page.getByText('How do I ask for the bill?', { exact: true })).toBeVisible();
});

test('@claim:paid-reflections a valid restored license enables weekly reflections', async ({ page }) => {
  let verifyRequests = 0;
  await page.route('https://api.sociobot.in/api/v1/products/calm-language-routine/verify?*', async (route) => {
    verifyRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) });
  });
  await page.goto('/shelf');
  await expect(page.getByText('One-time purchase · $12 USD')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'What do you want to remember?' })).toHaveCount(0);
  await page.getByText('Restore a purchase').click();
  await page.getByLabel('License token').fill('test-license-token');
  await page.getByRole('button', { name: 'Restore purchase' }).click();
  await expect(page.getByRole('textbox', { name: 'What do you want to remember?' })).toBeVisible();
  expect(verifyRequests).toBe(1);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'What do you want to remember?' })).toBeVisible();
  expect(verifyRequests).toBe(1);
});

test('@claim:no-engagement-mechanics a completed review requests no notification or push access', async ({ page }) => {
  await page.addInitScript(() => {
    (window as typeof window & { notificationRequests: number; pushSubscriptions: number }).notificationRequests = 0;
    (window as typeof window & { pushSubscriptions: number }).pushSubscriptions = 0;
    (window as typeof window & { notificationRequests: number }).Notification.requestPermission = async () => {
      (window as typeof window & { notificationRequests: number }).notificationRequests += 1;
      return 'denied';
    };
    const original = PushManager.prototype.subscribe;
    PushManager.prototype.subscribe = async function (...args) {
      (window as typeof window & { pushSubscriptions: number }).pushSubscriptions += 1;
      return original.apply(this, args);
    };
  });
  await page.goto('/cards');
  await addCard(page, 'One finite card', 'One answer');
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: 'Start today’s review' }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Review tomorrow' }).click();
  await expect(page.getByRole('heading', { name: 'Today’s review is complete' })).toBeVisible();
  const calls = await page.evaluate(() => ({
    notifications: (window as typeof window & { notificationRequests: number }).notificationRequests,
    pushes: (window as typeof window & { pushSubscriptions: number }).pushSubscriptions
  }));
  expect(calls).toEqual({ notifications: 0, pushes: 0 });
  await expect(page.getByRole('heading', { name: /streak|feed/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /notification|streak|feed/i })).toHaveCount(0);
});
