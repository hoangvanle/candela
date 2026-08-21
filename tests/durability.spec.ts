import { expect, test, type Page } from '@playwright/test';

/**
 * SPEC §10.3 — force-quitting loses nothing already committed with Return.
 *
 * A fire-and-forget IndexedDB write takes a few milliseconds to commit, and a
 * document torn down inside that window takes the row with it. CI on a slow
 * runner lost the last line of a note every time, which is what put the rescue
 * store in. The window itself is timing-dependent, so the mechanism is tested
 * directly rather than by trying to lose a race on purpose.
 */

const composer = (page: Page) => page.locator('.field input');

async function say(page: Page, text: string) {
  await composer(page).fill(text);
  await composer(page).press('Enter');
}

test('a line committed just before teardown survives', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start typing' }).click();

  // No assertions in between — nothing here gives IndexedDB time to settle.
  await say(page, 'Setenta');
  await say(page, 'enchufla, catch the free hand on 3');
  await say(page, 'wrap behind your back, elbows low');
  await page.reload();

  await expect(page.locator('.moverow .n')).toHaveText(['Setenta']);
  await expect(page.locator('.linerow .grow')).toHaveText([
    'enchufla, catch the free hand on 3',
    'wrap behind your back, elbows low',
  ]);
});

test('a write left unconfirmed at teardown is replayed on the next read', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start typing' }).click();
  await say(page, 'Vacílala');

  const noteId = await page.evaluate(() => location.hash.split('/')[2]);

  // Stand in for a write IndexedDB never confirmed: leave the rescue store
  // exactly as the teardown stash would have, holding a line the database has
  // never seen.
  await page.evaluate((id) => {
    const now = new Date().toISOString();
    localStorage.setItem(
      'candela.rescue',
      JSON.stringify([
        {
          table: 'items',
          row: {
            id: 'rescued-line',
            noteId: id,
            kind: 'line',
            text: 'she turns on her own axis, you only frame it',
            flag: '!',
            answer: '',
            tags: [],
            libraryMoveId: null,
            sort: 'a5',
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        },
      ]),
    );
  }, noteId);

  await page.reload();

  await expect(page.locator('.linerow .grow')).toHaveText([
    'she turns on her own axis, you only frame it',
  ]);
  await expect(page.locator('.linerow.imp .fm')).toHaveText('!');

  // Cleared once replayed, so it is not resurrected on every launch forever.
  expect(await page.evaluate(() => localStorage.getItem('candela.rescue'))).toBeNull();

  // And the recovered line is a normal line: it can be edited like any other.
  await page.locator('.linerow').click();
  await page.locator('.edrow input').fill('she turns on her own axis');
  await page.locator('.edrow input').press('Enter');
  await page.reload();
  await expect(page.locator('.linerow .grow')).toHaveText(['she turns on her own axis']);
});

test('a corrupt rescue store is discarded, not fatal', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start typing' }).click();
  await say(page, 'Enchufla');
  await say(page, 'open on 1, invite the exchange on 3');

  await page.evaluate(() => localStorage.setItem('candela.rescue', '{not json at all'));
  await page.reload();

  // The note is still readable and the bad entry is gone.
  await expect(page.locator('.moverow .n')).toHaveText(['Enchufla']);
  await expect(page.locator('.linerow .grow')).toHaveText(['open on 1, invite the exchange on 3']);
  expect(await page.evaluate(() => localStorage.getItem('candela.rescue'))).toBeNull();
});
