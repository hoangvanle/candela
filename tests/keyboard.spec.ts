import { expect, test, type Page } from '@playwright/test';

/**
 * The keyboard takes roughly half the screen, so what is left has to be spent on
 * the stream. Found on a real iPhone: 34px of dead grey below the accessory bar,
 * and the line she had just typed sitting below the fold.
 *
 * Chromium has no soft keyboard, so the two halves are checked separately — the
 * CSS against the state flag, and the re-pin against a real viewport resize.
 */

const composer = (page: Page) => page.locator('.field input');

async function say(page: Page, text: string) {
  await composer(page).fill(text);
  await composer(page).press('Enter');
}

const streamHeight = (page: Page) =>
  page.locator('.view').evaluate((el) => el.getBoundingClientRect().height);

test('the keyboard-up layout gives the dead space back to the stream', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start typing' }).click();
  await say(page, 'Sombrero');

  // A home-indicator iPhone reports 34px; the test viewport reports none, so
  // stand it in explicitly to measure what the rule is actually worth.
  await page.addStyleTag({
    content: ':root { --safe-bottom: 34px } .composer .safe { height: var(--safe-bottom) }',
  });

  const down = await streamHeight(page);

  await page.evaluate(() => {
    document.documentElement.dataset.keyboard = 'up';
  });

  const up = await streamHeight(page);

  // 34px of safe area plus 6px of navbar padding.
  expect(up - down).toBe(40);
  // The line count stays: hiding it shrinks nothing, because the navbar's height
  // comes from the 40px buttons either way.
  await expect(page.locator('.navbar h1 small')).toBeVisible();

  // The accessory bar itself is untouched — SPEC §6.3 fixes it at 48px.
  await expect(page.locator('.acc')).toHaveCSS('height', '48px');
  // And it still clears the home indicator when the keyboard is down.
  await page.evaluate(() => {
    document.documentElement.dataset.keyboard = 'down';
  });
  expect(await page.locator('.composer .safe').evaluate((el) => el.clientHeight)).toBe(34);
});

test('the line just typed stays in view when the viewport shrinks', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start typing' }).click();
  await say(page, 'Marcha suelta');
  for (let i = 1; i <= 12; i++) await say(page, `note number ${i}`);
  await page.getByRole('button', { name: 'New move' }).click();
  await say(page, 'Adiós');
  await say(page, 'look at her BEFORE you leave');

  const lastLine = page.locator('[data-id]').last();
  await expect(lastLine).toBeInViewport();

  // What the keyboard does: the scroll area loses half its height.
  await page.setViewportSize({ width: 393, height: 460 });
  await expect(lastLine).toBeInViewport();

  // And back again.
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(lastLine).toBeInViewport();
});
