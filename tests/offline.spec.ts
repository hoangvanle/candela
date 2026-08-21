import { expect, test, type Page } from '@playwright/test';

/**
 * SPEC §10.12 — the app loads with the network disabled. This is the whole point
 * of shipping it as a PWA: the studio has no signal, so a prep session happens
 * entirely offline.
 *
 * Runs against the built output on 127.0.0.1, which browsers treat as a secure
 * context, so the service worker registers exactly as it does over HTTPS.
 */

const composer = (page: Page) => page.locator('.field input');

async function say(page: Page, text: string) {
  await composer(page).fill(text);
  await composer(page).press('Enter');
}

test('a whole prep session survives the network being cut', async ({ page, context }) => {
  await page.goto('./');

  // Wait until the service worker has actually taken control of the page.
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
    timeout: 20_000,
  });

  await page.getByRole('button', { name: 'Start typing' }).click();
  await say(page, 'Sombrero');
  await say(page, 'her right hand behind your neck first');
  await say(page, '!you duck under, do not lift your arms');
  await say(page, '?does the hat land on 5 or on 7');

  const noteUrl = page.url();

  // Airplane mode.
  await context.setOffline(true);
  await page.reload();

  // The shell came from the precache and the note came from IndexedDB.
  await expect(page.locator('.moverow .n')).toHaveText(['Sombrero']);
  await expect(page.locator('.linerow .grow')).toHaveText([
    'her right hand behind your neck first',
    'you duck under, do not lift your arms',
    'does the hat land on 5 or on 7',
  ]);

  // And capture still works with no network at all.
  await say(page, 'hat lands on 5, unwind on 6-7');
  await expect(page.locator('.linerow .grow')).toHaveCount(4);

  // A cold launch from the home screen starts at the app root, not this note.
  await page.goto(new URL('./', noteUrl).href);
  await expect(page.locator('.hero h2')).toBeVisible();
  await page.locator('.tabbar a', { hasText: 'Classes' }).click();
  await expect(page.locator('.classrow .s')).toContainText('1 move · 5 lines');
});
