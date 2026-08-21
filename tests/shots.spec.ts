import { test, type Page } from '@playwright/test';

/**
 * Not assertions — a way to look at the real screens next to
 * design/prototype.html at the viewport it was tuned for. Run with
 * `npx playwright test shots` and look in test-results/shots/.
 */

const composer = (page: Page) => page.locator('.field input');

async function say(page: Page, text: string) {
  await composer(page).fill(text);
  await composer(page).press('Enter');
}

test('screens', async ({ page }) => {
  const shot = async (name: string) => {
    // Let transitions and the menu pop finish, or the shot catches them mid-flight.
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/shots/${name}.png` });
  };

  await page.goto('/');
  await shot('1-new-note');

  await page.getByRole('button', { name: 'Start typing' }).click();
  await shot('2-capture-empty');

  await say(page, 'Marcha suelta');
  await shot('3-capture-tag-prompt');

  await page.locator('.tagprompt').getByRole('button', { name: 'Warm-up' }).click();
  await say(page, '8 min at the start of every class in this block');
  await say(page, 'walk on the clave, arms completely loose');
  await say(page, '!ido: if they cant walk it they cant dance it');

  await page.getByRole('button', { name: 'New move' }).click();
  await shot('4-capture-new-move-mode');

  await say(page, 'Adiós');
  await page.locator('.tagprompt').getByRole('button', { name: 'Rutina' }).click();
  await say(page, 'look at her BEFORE you leave, that is the adiós');
  await say(page, '!in rueda everyone leaves on the same count');
  await say(page, '?does the free hand stay up or down on the exit');

  await page.getByRole('button', { name: 'New move' }).click();
  await say(page, 'Peso en el suelo');
  await page.locator('.tagprompt').getByRole('button', { name: 'Principle' }).click();
  await say(page, 'weight through the whole foot, never the toes');
  await say(page, '!ido says this is why the turns come late');
  await shot('5-capture-mid-session');

  await page.locator('button.token').click();
  await shot('6-write-into');
  await page.locator('.menuscrim').click();

  await page.locator('.moverow').first().click({ position: { x: 200, y: 10 } });
  await page.locator('.chip.here').waitFor({ state: 'attached' }).catch(() => {});

  await page.getByRole('button', { name: 'Done' }).click();
  await shot('7-classes');

  await page.locator('.tabbar a', { hasText: 'Ask Ido' }).click();
  await shot('8-ask-stub');
});
