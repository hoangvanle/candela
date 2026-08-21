import { expect, test, type Page } from '@playwright/test';

/**
 * An installed iOS PWA has no address bar, no reload button and no
 * pull-to-refresh, and relaunching from the home screen usually resumes rather
 * than reloads — so without an in-app control a new version never arrives and
 * deleting the app looks like the only way out.
 */

const composer = (page: Page) => page.locator('.field input');

test('the build footer names the build and reloads the app', async ({ page }) => {
  await page.goto('./');

  const foot = page.locator('.buildfoot');
  await expect(foot).toBeVisible();
  // The stamp has to be specific enough to tell two builds apart.
  await expect(foot.locator('.id')).toContainText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);

  // A note first, so the reload can be shown to keep her work.
  await page.getByRole('button', { name: 'Start typing' }).click();
  await composer(page).fill('Sombrero');
  await composer(page).press('Enter');
  await page.getByRole('button', { name: 'Done' }).click();

  await page.locator('.tabbar a', { hasText: 'New note' }).click();
  await page.locator('.buildfoot button').click();

  await expect(page.locator('.buildfoot')).toBeVisible();
  await page.locator('.tabbar a', { hasText: 'Classes' }).click();
  await expect(page.locator('.classrow .t')).toHaveText('Class 1');
});

test('the reload control stays off the capture screen', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start typing' }).click();

  // Nothing that could reload the page goes near a live keyboard and a
  // half-typed line (CLAUDE.md rule 3).
  await expect(page.locator('.buildfoot')).toHaveCount(0);
  await expect(page.locator('.update-bar')).toHaveCount(0);
});

test('a version landing mid-capture waits until she leaves', async ({ page }) => {
  await page.goto('./');
  // A first-ever load goes from uncontrolled to controlled, which is not an
  // update and is deliberately ignored. Reload so the page starts controlled,
  // which is the state every launch of the installed app is in.
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
    timeout: 20_000,
  });
  await page.reload();

  await page.getByRole('button', { name: 'Start typing' }).click();
  await composer(page).fill('Adiós');
  await composer(page).press('Enter');

  // Stand in for a new service worker taking over while she is typing.
  await composer(page).fill('a half-written line');
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));

  // No banner, and the half-written line is untouched.
  await expect(page.locator('.update-bar')).toHaveCount(0);
  await expect(composer(page)).toHaveValue('a half-written line');

  // It surfaces the moment she is out of the capture screen.
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.update-bar')).toContainText('A newer version is ready');
  await expect(page.locator('.update-bar button')).toHaveText('Reload');
});
