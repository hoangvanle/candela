import { expect, test, type Page } from '@playwright/test';

/**
 * SPEC §11 step 2 and the acceptance criteria in §10 that it can already satisfy.
 * These drive real keyboard and pointer events — the point is to catch the things
 * that only show up with a live focused field, not to re-assert the render.
 */

const composer = (page: Page) => page.locator('.field input');
const lines = (page: Page) => page.locator('.linerow .grow');
const moveTitles = (page: Page) => page.locator('.moverow .n');

/** Opens a fresh note and returns with the keyboard up in new-move mode. */
async function startNote(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start typing' }).click();
  await expect(composer(page)).toBeFocused();
}

/** Types a line and commits it with Return. */
async function say(page: Page, text: string) {
  await composer(page).fill(text);
  await composer(page).press('Enter');
}

async function activeIsComposer(page: Page) {
  return page.evaluate(() => document.activeElement?.getAttribute('placeholder') ?? null);
}

test('two taps from a cold launch and the keyboard is up (§10.1)', async ({ page }) => {
  await page.goto('/');
  // The app opens on the New note tab, so "Start typing" is the only tap needed.
  await expect(page.locator('.hero h2')).toHaveText('L1 · B1 · C1');
  await page.getByRole('button', { name: 'Start typing' }).click();
  await expect(composer(page)).toBeFocused();
  // A new note opens in new-move mode: the first thing typed names a move.
  await expect(page.locator('.token.on')).toHaveText('NEW MOVE');
  await expect(composer(page)).toHaveAttribute('placeholder', 'Move name…');
  await expect(page.locator('.field.move')).toBeVisible();
});

test('return commits the line, clears the field and keeps focus', async ({ page }) => {
  await startNote(page);
  await say(page, 'Marcha suelta');

  await expect(moveTitles(page)).toHaveText(['Marcha suelta']);
  await expect(composer(page)).toHaveValue('');
  await expect(composer(page)).toBeFocused();
  // Committing a move switches out of new-move mode and writes into it.
  await expect(page.locator('.token')).toHaveText('Marcha suelta');
  await expect(page.locator('.chip.here')).toHaveText('writing here');

  await say(page, 'walk on the clave, arms completely loose');
  await expect(lines(page)).toHaveText(['walk on the clave, arms completely loose']);
  await expect(composer(page)).toBeFocused();
});

test('a leading ! or ? sets the flag and is stripped from the text', async ({ page }) => {
  await startNote(page);
  await say(page, 'Adiós');
  await say(page, '!in rueda everyone leaves on the same count');
  await say(page, '?does the free hand stay up or down');

  await expect(lines(page)).toHaveText([
    'in rueda everyone leaves on the same count',
    'does the free hand stay up or down',
  ]);
  await expect(page.locator('.linerow.imp .fm')).toHaveText('!');
  await expect(page.locator('.linerow.q .fm')).toHaveText('?');
});

test('the ! and ? buttons arm the next line and reset after it commits', async ({ page }) => {
  await startNote(page);
  await say(page, 'Peso en el suelo');

  const bang = page.getByRole('button', { name: 'Mark the next line important' });
  await bang.click();
  await expect(bang).toHaveAttribute('aria-pressed', 'true');
  // Tapping the accessory bar must not pull focus off the field.
  expect(await activeIsComposer(page)).toBe('What Ido says…');

  await say(page, 'ido says this is why the turns come late');
  await expect(bang).toHaveAttribute('aria-pressed', 'false');

  await say(page, 'say it in every class, not only this block');

  await expect(page.locator('.linerow.imp .grow')).toHaveText(
    'ido says this is why the turns come late',
  );
  await expect(page.locator('.linerow:not(.imp):not(.q) .grow')).toHaveText(
    'say it in every class, not only this block',
  );
});

test('a line lands after the current move, not at the end of the note (§6.3)', async ({ page }) => {
  await startNote(page);
  await say(page, 'Marcha suelta');
  await say(page, 'walk on the clave');

  await page.getByRole('button', { name: 'New move' }).click();
  await say(page, 'Adiós');
  await say(page, 'half turn on 3');

  // Jump back to the first move via the Write-into menu and add to it there.
  await page.locator('button.token').click();
  await page.getByRole('menuitem', { name: 'Marcha suelta' }).click();
  await expect(page.locator('.token')).toHaveText('Marcha suelta');
  await say(page, '8 min at the start of every class');

  await expect(lines(page)).toHaveText([
    'walk on the clave',
    '8 min at the start of every class',
    'half turn on 3',
  ]);
});

test('writing into the end of the note appends past every move', async ({ page }) => {
  await startNote(page);
  await say(page, 'Dame');
  await say(page, 'teach the circle before the call');

  await page.locator('button.token').click();
  await page.getByRole('menuitem', { name: 'End of the note' }).click();
  await expect(page.locator('.token')).toHaveText('End of note');
  await say(page, 'ask ido which song he used');

  await expect(lines(page)).toHaveText([
    'teach the circle before the call',
    'ask ido which song he used',
  ]);
  // No move is being written into, so nothing is marked "writing here".
  await expect(page.locator('.chip.here')).toHaveCount(0);
  await expect(page.locator('.moverow.idle')).toHaveCount(1);
});

test('20 lines and 5 moves cost 5 extra taps and nothing else (§10.2)', async ({ page }) => {
  await startNote(page);

  const newMove = page.getByRole('button', { name: 'New move' });
  let taps = 0;

  for (let m = 0; m < 5; m++) {
    // The note opens in new-move mode, so the first move needs no tap at all.
    if (m > 0) {
      await newMove.click();
      taps++;
    }
    await say(page, `Move ${m + 1}`);
    for (let l = 0; l < 4; l++) await say(page, `note ${m + 1}.${l + 1}`);
  }

  expect(taps).toBeLessThanOrEqual(5);
  await expect(moveTitles(page)).toHaveCount(5);
  await expect(lines(page)).toHaveCount(20);
  await expect(page.locator('.navbar h1 small')).toHaveText('prep with Ido · 25 lines');
});

test('nothing committed with Return is lost on a reload (§10.3)', async ({ page }) => {
  await startNote(page);
  await say(page, 'Coca-Cola');
  await say(page, 'walk BEHIND her back, not around her');
  await say(page, '!he uses a different entry');

  // Typed but never committed — this one is expected to go.
  await composer(page).fill('half a sentence');

  const url = page.url();
  await page.reload();
  await page.goto(url);

  await expect(moveTitles(page)).toHaveText(['Coca-Cola']);
  await expect(lines(page)).toHaveText([
    'walk BEHIND her back, not around her',
    'he uses a different entry',
  ]);
  await expect(page.locator('.linerow.imp .fm')).toHaveText('!');
  // Reopening resumes in the last move rather than starting a new one.
  await expect(page.locator('.token')).toHaveText('Coca-Cola');
});

test('the tag prompt appears with a new move and goes when the next line is typed', async ({
  page,
}) => {
  await startNote(page);
  await say(page, 'Marcha suelta');

  const prompt = page.locator('.tagprompt');
  await expect(prompt).toBeVisible();
  // The three seeded tags come from the tags table, not from an enum (rule 7).
  await expect(prompt.locator('button')).toHaveText(['Warm-up', 'Principle', 'Rutina', '+']);

  await prompt.getByRole('button', { name: 'Warm-up' }).click();
  await expect(page.locator('.moverow .chip.t-blue')).toHaveText('Warm-up');
  // Tagging must not drop the keyboard either.
  expect(await activeIsComposer(page)).toBe('What Ido says…');

  await say(page, 'arms down, only feet, 6 minutes');
  await expect(prompt).toHaveCount(0);
  // The tag survives the prompt disappearing.
  await expect(page.locator('.moverow .chip.t-blue')).toHaveText('Warm-up');
});

test('a tag invented during capture is created, applied and persisted (§10.10)', async ({
  page,
}) => {
  await startNote(page);
  await say(page, 'Sombrero');

  await page.locator('.tagprompt').getByRole('button', { name: 'More tags' }).click();
  await page.getByLabel('New tag').fill('for the warm-up');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  // User-created tags are teal (SPEC §8).
  await expect(page.locator('.tagpick .t-teal')).toContainText('for the warm-up');
  await page.locator('.sheet').getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.moverow .chip.t-teal')).toHaveText('for the warm-up');

  await page.reload();
  await expect(page.locator('.moverow .chip.t-teal')).toHaveText('for the warm-up');
});

test('toggling New move flips the field into and out of move mode', async ({ page }) => {
  await startNote(page);
  await say(page, 'Vacílala');
  await expect(page.locator('.field.move')).toHaveCount(0);

  const newMove = page.getByRole('button', { name: 'New move' });
  await newMove.click();
  await expect(page.locator('.field.move')).toBeVisible();
  await expect(page.locator('.token.on')).toHaveText('NEW MOVE');

  await newMove.click();
  await expect(page.locator('.field.move')).toHaveCount(0);
  await expect(page.locator('.token')).toHaveText('Vacílala');
});

test('the first lines of a note are loose until a move exists (§5 grouping)', async ({ page }) => {
  await startNote(page);
  // Drop out of new-move mode and type before any move is named.
  await page.getByRole('button', { name: 'New move' }).click();
  await say(page, 'ido was 10 min late, started with the circle');

  await expect(page.locator('.linerow.loose .grow')).toHaveText(
    'ido was 10 min late, started with the circle',
  );

  await page.getByRole('button', { name: 'New move' }).click();
  await say(page, 'Paso marcado');
  await say(page, 'arms down, only feet');

  // The loose line stays loose; the new one belongs to the move.
  await expect(page.locator('.linerow.loose')).toHaveCount(1);
  await expect(page.locator('.linerow:not(.loose) .grow')).toHaveText('arms down, only feet');
});

test('the classes list shows what was captured and reopens it', async ({ page }) => {
  await startNote(page);
  await say(page, 'Setenta');
  await say(page, 'wrap behind your back, elbows low');
  await say(page, '?is this still level 2');

  await page.getByRole('button', { name: 'Done' }).click();

  await expect(page.locator('.group')).toHaveText('Level 1 · Block 1');
  await expect(page.locator('.classrow .t')).toHaveText('Class 1');
  await expect(page.locator('.classrow .s')).toContainText('1 move · 3 lines');
  // An open question is counted for Ask Ido, on the row and on the tab.
  await expect(page.locator('.classrow .chip')).toHaveText('1 open');
  await expect(page.locator('.tabbar .badge')).toHaveText('1');

  await page.locator('.classrow').click();
  await expect(moveTitles(page)).toHaveText(['Setenta']);
  // The tab bar is hidden on Capture (SPEC §6).
  await expect(page.locator('.tabbar')).toHaveCount(0);
});

test('the second note pre-fills the next class in the block', async ({ page }) => {
  await startNote(page);
  await say(page, 'Enchufla');
  await page.getByRole('button', { name: 'Done' }).click();

  await page.locator('.tabbar a', { hasText: 'New note' }).click();
  await expect(page.locator('.hero h2')).toHaveText('L1 · B1 · C2');
  // The note started today is still reachable.
  await expect(page.locator('.continue .t')).toHaveText('Continue L1 · B1 · C1');
});

test('a move already written down is offered, and linking keeps its spelling', async ({ page }) => {
  await startNote(page);
  await say(page, 'Sombrero');
  await say(page, 'her right hand behind your neck first');
  await page.getByRole('button', { name: 'Done' }).click();

  // A second class in the same block.
  await page.locator('.tabbar a', { hasText: 'New note' }).click();
  await page.getByRole('button', { name: 'Start typing' }).click();
  await composer(page).fill('sombre');

  const sugg = page.locator('.sugg');
  await expect(sugg).toContainText('Sombrero');
  await expect(sugg).toContainText('L1 · B1 · C1');

  await sugg.getByRole('button', { name: 'Use' }).click();
  // Canonical spelling, not what was half-typed — so the Moves tab can dedupe.
  await expect(moveTitles(page)).toHaveText(['Sombrero']);
  await expect(page.locator('.libnote')).toContainText('written down before');
});
